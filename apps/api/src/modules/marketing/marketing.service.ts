import { PrismaClient, type Prisma } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { logger } from '../../lib/logger.js';
import type { CreateCouponInput, ValidateCouponInput, CreateReturnInput, UpdateReturnInput } from './marketing.schema.js';

const prisma = new PrismaClient();

// ── Coupon Service ─────────────────────────────────────────────

export const couponService = {
  async create(data: CreateCouponInput, adminId: string) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError(ErrorCodes.CONFLICT, `Coupon code "${data.code}" already exists`, 409);

    return prisma.coupon.create({
      data: {
        ...data,
        createdByAdminId: adminId,
      },
    });
  },

  async validate(data: ValidateCouponInput, customerId?: string): Promise<{
    valid: boolean;
    discountAmount: number;
    newTotal: number;
    message: string;
    coupon?: { id: string; code: string; type: string; value: number };
  }> {
    const coupon = await prisma.coupon.findUnique({ where: { code: data.code } });

    if (!coupon || !coupon.isActive) {
      return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'Invalid or expired coupon code' };
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'This coupon is not yet active' };
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'This coupon has expired' };
    }
    if (data.orderAmount < Number(coupon.minOrderAmount)) {
      return {
        valid: false, discountAmount: 0, newTotal: data.orderAmount,
        message: `Minimum order Rs. ${Number(coupon.minOrderAmount).toLocaleString('en-LK')} required for this coupon`,
      };
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'This coupon has reached its usage limit' };
    }
    if (customerId) {
      const userUsage = await prisma.couponUsage.count({ where: { couponId: coupon.id, customerId } });
      if (userUsage >= coupon.usageLimitPerUser) {
        return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'You have already used this coupon' };
      }
    }
    if (coupon.applicableVendorId && data.vendorId && coupon.applicableVendorId !== data.vendorId) {
      return { valid: false, discountAmount: 0, newTotal: data.orderAmount, message: 'This coupon is not valid for the selected vendor' };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (data.orderAmount * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(Number(coupon.value), data.orderAmount);
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountAmount = 350; // Standard shipping fee
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const newTotal = Math.max(0, data.orderAmount - discountAmount);

    return {
      valid: true,
      discountAmount,
      newTotal,
      message: `Coupon applied! You save Rs. ${discountAmount.toLocaleString('en-LK')}`,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: Number(coupon.value) },
    };
  },

  async redeem(couponId: string, orderId: string, customerId: string) {
    await prisma.$transaction([
      prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } }),
      prisma.couponUsage.create({ data: { couponId, orderId, customerId } }),
    ]);
  },

  async list(params: { page: number; limit: number; isActive?: boolean }) {
    const { page, limit, isActive } = params;
    const where: Prisma.CouponWhereInput = isActive !== undefined ? { isActive } : {};
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ]);
    return { coupons, meta: { total, page, limit } };
  },

  async toggle(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new AppError(ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
    return prisma.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  },
};

// ── Return Service ─────────────────────────────────────────────

export const returnService = {
  async create(data: CreateReturnInput, customerId: string) {
    // Validate order ownership
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (order.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    if (!['DELIVERED'].includes(order.status)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Returns can only be initiated for delivered orders', 422);
    }

    // Check 7-day return window
    const deliveredAt = order.updatedAt; // Approximate; in prod use deliveredAt timestamp
    const returnWindowDays = 7;
    const windowExpiry = new Date(deliveredAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000);
    if (new Date() > windowExpiry) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Return window has expired (7 days after delivery)', 422);
    }

    // Validate item IDs belong to order
    const orderItemIds = new Set(order.items.map((i) => i.id));
    for (const ri of data.items) {
      if (!orderItemIds.has(ri.orderItemId)) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, `Item ${ri.orderItemId} does not belong to this order`, 422);
      }
    }

    // Calculate potential refund amount
    const refundableAmount = data.items.reduce((sum, ri) => {
      const item = order.items.find((i) => i.id === ri.orderItemId)!;
      return sum + (Number(item.unitPrice) * ri.quantity);
    }, 0);

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: data.orderId,
        customerId,
        status: 'PENDING',
        preferredResolution: data.preferredResolution,
        notes: data.notes,
        refundableAmount,
        items: {
          create: data.items.map((ri) => ({
            orderItemId: ri.orderItemId,
            quantity: ri.quantity,
            reason: ri.reason,
          })),
        },
      },
      include: { items: true },
    });

    logger.info({ returnId: returnRequest.id, orderId: data.orderId }, 'Return request created');
    return returnRequest;
  },

  async update(returnId: string, data: UpdateReturnInput, adminId: string) {
    const r = await prisma.returnRequest.findUnique({ where: { id: returnId } });
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Return request not found', 404);

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: data.status,
        adminNote: data.adminNote,
        refundAmount: data.refundAmount,
        refundReference: data.refundReference,
        resolvedAt: ['REFUND_COMPLETED', 'RESOLVED'].includes(data.status) ? new Date() : undefined,
        resolvedByAdminId: adminId,
      },
    });

    // If approved: mark order items as returned in inventory
    if (data.status === 'APPROVED') {
      const items = await prisma.returnRequestItem.findMany({ where: { returnRequestId: returnId }, include: { orderItem: true } });
      for (const item of items) {
        await prisma.inventoryRecord.updateMany({
          where: { variantId: item.orderItem.variantId },
          data: { quantity: { increment: item.quantity } }, // Return to stock
        });
      }
    }

    logger.info({ returnId, status: data.status, adminId }, 'Return request updated');
    return updated;
  },

  async listCustomer(customerId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where: { customerId },
        include: { items: { include: { orderItem: { select: { productTitle: true } } } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.returnRequest.count({ where: { customerId } }),
    ]);
    return { returns, meta: { total, page, limit } };
  },

  async listAdmin(params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const where: Prisma.ReturnRequestWhereInput = status ? { status } : {};
    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          items: true,
          order: { select: { orderNumber: true } },
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.returnRequest.count({ where }),
    ]);
    return { returns, meta: { total, page, limit } };
  },
};

// ── Wishlist Service ───────────────────────────────────────────

export const wishlistService = {
  async get(customerId: string) {
    return prisma.wishlistItem.findMany({
      where: { customerId },
      include: {
        product: {
          select: {
            id: true, title: true, slug: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
            variants: { take: 1, select: { price: true, comparePrice: true } },
            vendor: { select: { businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async add(customerId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, 'Product not found', 404);

    return prisma.wishlistItem.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId },
      update: {},
    });
  },

  async remove(customerId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({ where: { customerId, productId } });
    return { message: 'Removed from wishlist' };
  },

  async isInWishlist(customerId: string, productId: string) {
    const item = await prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    return { inWishlist: !!item };
  },
};
