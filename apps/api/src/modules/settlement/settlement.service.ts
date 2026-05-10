import { PrismaClient, type Prisma, type OrderStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { logger } from '../../lib/logger.js';

const prisma = new PrismaClient();

// ── Platform commission rate ───────────────────────────────────
const PLATFORM_COMMISSION_RATE = 0.10; // 10%

// ── Settlement Service ─────────────────────────────────────────

export const settlementService = {
  /**
   * Calculate a vendor's pending payable amount:
   * sum of delivered VendorOrders not yet settled, minus 10% commission.
   */
  async calculateVendorBalance(vendorId: string) {
    // Delivered sub-orders not yet included in a settlement
    const deliveredOrders = await prisma.vendorOrder.findMany({
      where: { vendorId, status: 'DELIVERED', settlementId: null },
      select: { id: true, total: true, shippingFee: true },
    });

    const grossRevenue = deliveredOrders.reduce((s, o) => s + Number(o.total), 0);
    const commission = grossRevenue * PLATFORM_COMMISSION_RATE;
    const netPayable = grossRevenue - commission;

    return {
      vendorId,
      pendingOrderCount: deliveredOrders.length,
      grossRevenue,
      commission,
      commissionRate: PLATFORM_COMMISSION_RATE,
      netPayable,
      currency: 'LKR' as const,
    };
  },

  /**
   * Create a settlement record (payout) for a vendor.
   * Marks all qualifying delivered VendorOrders as settled.
   */
  async createSettlement(vendorId: string, requestedByAdminId: string) {
    const balance = await this.calculateVendorBalance(vendorId);

    if (balance.netPayable <= 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No pending balance to settle', 422);
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { payoutAccount: { take: 1 } },
    });
    if (!vendor) throw new AppError(ErrorCodes.NOT_FOUND, 'Vendor not found', 404);

    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.settlement.create({
        data: {
          vendorId,
          grossRevenue: balance.grossRevenue,
          commission: balance.commission,
          netPayable: balance.netPayable,
          currency: 'LKR',
          status: 'PENDING',
          bankAccount: vendor.payoutAccount[0]
            ? {
                bankName: vendor.payoutAccount[0].bankName,
                accountNumber: vendor.payoutAccount[0].accountNumber,
                accountHolder: vendor.payoutAccount[0].accountHolderName,
              }
            : null,
          createdByAdminId: requestedByAdminId,
        },
      });

      // Mark all qualifying vendor orders as settled
      await tx.vendorOrder.updateMany({
        where: { vendorId, status: 'DELIVERED', settlementId: null },
        data: { settlementId: s.id },
      });

      // Write to append-only ledger
      await tx.ledgerEntry.create({
        data: {
          vendorId,
          settlementId: s.id,
          type: 'SETTLEMENT_CREATED',
          amount: balance.netPayable,
          currency: 'LKR',
          description: `Settlement #${s.id} — ${balance.pendingOrderCount} orders`,
        },
      });

      return s;
    });

    logger.info({ settlementId: settlement.id, vendorId, netPayable: balance.netPayable }, 'Settlement created');
    return settlement;
  },

  async markSettlementPaid(settlementId: string, adminId: string, reference: string) {
    const s = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!s) throw new AppError(ErrorCodes.NOT_FOUND, 'Settlement not found', 404);

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date(), paymentReference: reference },
    });

    await prisma.ledgerEntry.create({
      data: {
        vendorId: s.vendorId,
        settlementId,
        type: 'SETTLEMENT_PAID',
        amount: s.netPayable,
        currency: 'LKR',
        description: `Paid via bank transfer — ref: ${reference}`,
      },
    });

    logger.info({ settlementId, adminId, reference }, 'Settlement marked as paid');
    return updated;
  },

  async listVendorSettlements(vendorId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({ where: { vendorId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.settlement.count({ where: { vendorId } }),
    ]);
    return { settlements, meta: { total, page, limit } };
  },

  async listAllSettlements(params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.SettlementWhereInput = status ? { status: status as 'PENDING' | 'PAID' | 'FAILED' } : {};
    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: { vendor: { select: { businessName: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.count({ where }),
    ]);
    return { settlements, meta: { total, page, limit } };
  },
};

// ── Platform Analytics ─────────────────────────────────────────

export const analyticsService = {
  async getPlatformOverview(period: '7d' | '30d' | '90d' = '30d') {
    const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[period];
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [
      gmvRaw, orderCount, newVendors, newCustomers,
      pendingApprovals, topVendors, ordersByStatus, revenueByDay,
    ] = await Promise.all([
      // GMV — only paid orders
      prisma.order.aggregate({
        where: { createdAt: { gte: since }, paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      // All orders in period
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      // New vendor registrations
      prisma.vendorProfile.count({ where: { createdAt: { gte: since } } }),
      // New customer signups
      prisma.user.count({ where: { createdAt: { gte: since }, role: 'CUSTOMER' } }),
      // Vendors awaiting approval
      prisma.vendorProfile.count({ where: { status: 'PENDING_REVIEW' } }),
      // Top vendors by revenue
      prisma.vendorOrder.groupBy({
        by: ['vendorId'],
        where: { createdAt: { gte: since }, status: { in: ['SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      // Orders by status distribution
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      // Daily revenue for chart (last 30 days, raw SQL)
      prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
        SELECT
          DATE("createdAt") as date,
          SUM(total)::float as revenue,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE "createdAt" >= ${since}
          AND "paymentStatus" = 'PAID'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    const gmv = Number(gmvRaw._sum.total ?? 0);
    const commission = gmv * PLATFORM_COMMISSION_RATE;

    // Enrich top vendors with names
    const vendorIds = topVendors.map((v) => v.vendorId);
    const vendorNames = await prisma.vendorProfile.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, businessName: true, storefront: { select: { slug: true } } },
    });
    const nameMap = new Map(vendorNames.map((v) => [v.id, v]));

    return {
      period,
      gmv,
      commission,
      orderCount,
      paidOrderCount: gmvRaw._count,
      newVendors,
      newCustomers,
      pendingApprovals,
      conversionRate: orderCount > 0 ? ((gmvRaw._count / orderCount) * 100).toFixed(1) : '0',
      avgOrderValue: gmvRaw._count > 0 ? gmv / gmvRaw._count : 0,
      topVendors: topVendors.map((v) => ({
        vendorId: v.vendorId,
        businessName: nameMap.get(v.vendorId)?.businessName ?? 'Unknown',
        slug: nameMap.get(v.vendorId)?.storefront?.slug,
        revenue: Number(v._sum.total ?? 0),
        orderCount: v._count,
      })),
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      revenueByDay,
      currency: 'LKR' as const,
    };
  },

  async getVendorAnalytics(vendorId: string, period: '7d' | '30d' | '90d' = '30d') {
    const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[period];
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [revenue, orderCount, topProducts, ordersByStatus] = await Promise.all([
      prisma.vendorOrder.aggregate({
        where: { vendorId, createdAt: { gte: since }, status: { in: ['SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.vendorOrder.count({ where: { vendorId, createdAt: { gte: since } } }),
      // Top products by units sold
      prisma.orderItem.groupBy({
        by: ['variantId'],
        where: { vendorId, createdAt: { gte: since } },
        _sum: { quantity: true, total: true },
        _count: true,
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.vendorOrder.groupBy({
        by: ['status'],
        where: { vendorId, createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    const gross = Number(revenue._sum.total ?? 0);
    const commission = gross * PLATFORM_COMMISSION_RATE;

    return {
      period,
      grossRevenue: gross,
      commission,
      netRevenue: gross - commission,
      orderCount,
      paidOrderCount: revenue._count,
      avgOrderValue: revenue._count > 0 ? gross / revenue._count : 0,
      topProducts,
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      currency: 'LKR' as const,
    };
  },
};
