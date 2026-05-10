import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from './email.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const prisma = new PrismaClient();

// Separate Redis connection for BullMQ (requires blocking commands)
const bullRedis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

// ── Queue definitions ──────────────────────────────────────────

export const abandonedCartQueue = new Queue('abandoned-cart', {
  connection: bullRedis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const reportQueue = new Queue('report-generation', {
  connection: bullRedis,
  defaultJobOptions: { removeOnComplete: 20, removeOnFail: 10, attempts: 2 },
});

// ── Abandoned Cart Logic ───────────────────────────────────────

/**
 * Schedule an abandoned cart check for a user after 1 hour.
 * Called when a cart is updated but checkout is not started.
 * Deduplicated by userId — re-schedules if already pending.
 */
export async function scheduleAbandonedCartCheck(userId: string, cartId: string) {
  const jobId = `abandoned:${userId}`;
  // Remove any existing job to reset the timer
  const existing = await abandonedCartQueue.getJob(jobId);
  if (existing) await existing.remove();

  await abandonedCartQueue.add(
    'check-abandoned',
    { userId, cartId },
    {
      jobId,
      delay: 60 * 60 * 1000, // 1 hour
    },
  );
  logger.debug({ userId, cartId }, 'Abandoned cart check scheduled');
}

/**
 * Cancel abandoned cart job when user completes checkout.
 */
export async function cancelAbandonedCartJob(userId: string) {
  const job = await abandonedCartQueue.getJob(`abandoned:${userId}`);
  if (job) await job.remove();
}

// ── Workers ────────────────────────────────────────────────────

export function startAbandonedCartWorker() {
  const worker = new Worker(
    'abandoned-cart',
    async (job: Job<{ userId: string; cartId: string }>) => {
      const { userId, cartId } = job.data;

      // Check if cart still has items and user hasn't ordered recently
      const [cart, recentOrder] = await Promise.all([
        prisma.cart.findUnique({
          where: { id: cartId },
          include: {
            items: {
              include: {
                variant: { include: { product: { select: { title: true } } } },
              },
              take: 3,
            },
          },
        }),
        prisma.order.findFirst({
          where: { customerId: userId, createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        }),
      ]);

      if (!cart || cart.items.length === 0 || recentOrder) {
        logger.debug({ userId }, 'Abandoned cart job skipped — cart empty or order placed');
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
      if (!user) return;

      const itemSummary = cart.items.map((i) => i.variant.product.title).join(', ');
      const topItems = cart.items.slice(0, 3);

      await sendEmail({
        to: user.email,
        subject: `${user.firstName}, you left something behind! 🛍️`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
            <h2>Hey ${user.firstName}, your cart misses you!</h2>
            <p>You left these items in your cart:</p>
            <ul>
              ${topItems.map((i) => `<li><strong>${i.variant.product.title}</strong> ×${i.quantity}</li>`).join('')}
              ${cart.items.length > 3 ? `<li>...and ${cart.items.length - 3} more</li>` : ''}
            </ul>
            <p>Complete your purchase before items sell out!</p>
            <a href="${env.APP_URL}/cart" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Complete My Purchase →
            </a>
            <p style="margin-top:24px;color:#888;font-size:12px;">
              You're receiving this because you have items in your MarkComm cart.
              <a href="${env.APP_URL}/profile/preferences">Unsubscribe from cart reminders</a>
            </p>
          </div>
        `,
      });

      logger.info({ userId, cartId, itemCount: cart.items.length }, 'Abandoned cart email sent');
    },
    { connection: bullRedis, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Abandoned cart job failed');
  });

  return worker;
}

// ── Report Generation Worker ────────────────────────────────────

export type ReportJobData = {
  type: 'VENDOR_ORDERS' | 'PLATFORM_GMV' | 'SETTLEMENT_HISTORY';
  vendorId?: string;
  adminId: string;
  format: 'CSV' | 'XLSX';
  period: { from: string; to: string };
  requestId: string;
};

export function startReportWorker() {
  const worker = new Worker(
    'report-generation',
    async (job: Job<ReportJobData>) => {
      const { type, vendorId, format, period, requestId } = job.data;
      const from = new Date(period.from);
      const to = new Date(period.to);

      logger.info({ requestId, type, format }, 'Generating report');

      let rows: Record<string, unknown>[] = [];

      if (type === 'VENDOR_ORDERS' && vendorId) {
        const orders = await prisma.vendorOrder.findMany({
          where: { vendorId, createdAt: { gte: from, lte: to } },
          include: {
            order: { select: { orderNumber: true, createdAt: true, shippingAddress: true } },
            items: { select: { productTitle: true, quantity: true, unitPrice: true, total: true } },
          },
          orderBy: { createdAt: 'asc' },
        });

        rows = orders.flatMap((vo) =>
          vo.items.map((item) => ({
            'Order Number': vo.order.orderNumber,
            'Order Date': vo.order.createdAt.toISOString().split('T')[0],
            'Product': item.productTitle,
            'Quantity': item.quantity,
            'Unit Price (LKR)': Number(item.unitPrice),
            'Total (LKR)': Number(item.total),
            'Order Status': vo.status,
            'Tracking': vo.trackingNumber ?? '',
          })),
        );
      } else if (type === 'PLATFORM_GMV') {
        const orders = await prisma.order.findMany({
          where: { createdAt: { gte: from, lte: to }, paymentStatus: 'PAID' },
          select: { orderNumber: true, createdAt: true, subtotal: true, shippingFee: true, total: true, status: true, paymentMethod: true },
          orderBy: { createdAt: 'asc' },
        });

        rows = orders.map((o) => ({
          'Order Number': o.orderNumber,
          'Date': o.createdAt.toISOString().split('T')[0],
          'Subtotal (LKR)': Number(o.subtotal),
          'Shipping (LKR)': Number(o.shippingFee),
          'Total (LKR)': Number(o.total),
          'Commission (LKR)': Number(o.total) * 0.10,
          'Status': o.status,
          'Payment': o.paymentMethod,
        }));
      } else if (type === 'SETTLEMENT_HISTORY') {
        const settlements = await prisma.settlement.findMany({
          where: { createdAt: { gte: from, lte: to }, ...(vendorId ? { vendorId } : {}) },
          include: { vendor: { select: { businessName: true } } },
          orderBy: { createdAt: 'asc' },
        });

        rows = settlements.map((s) => ({
          'Settlement ID': s.id,
          'Vendor': s.vendor.businessName,
          'Gross Revenue (LKR)': Number(s.grossRevenue),
          'Commission (LKR)': Number(s.commission),
          'Net Payable (LKR)': Number(s.netPayable),
          'Status': s.status,
          'Created': s.createdAt.toISOString().split('T')[0],
          'Paid At': s.paidAt?.toISOString().split('T')[0] ?? '',
          'Bank Reference': s.paymentReference ?? '',
        }));
      }

      // Generate CSV
      if (rows.length === 0) {
        logger.warn({ requestId }, 'Report generated with 0 rows');
      }

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => {
            const val = String(row[h] ?? '');
            return val.includes(',') ? `"${val}"` : val;
          }).join(','),
        ),
      ].join('\n');

      // Store result in Redis for 24 hours — caller polls via requestId
      await bullRedis.setex(`report:result:${requestId}`, 86400, csv);
      await bullRedis.setex(`report:status:${requestId}`, 86400, JSON.stringify({ status: 'DONE', rowCount: rows.length, format }));

      logger.info({ requestId, rowCount: rows.length }, 'Report ready');
    },
    { connection: bullRedis, concurrency: 2 },
  );

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Report generation failed');
    if (job?.data.requestId) {
      await bullRedis.setex(`report:status:${job.data.requestId}`, 3600, JSON.stringify({ status: 'FAILED', error: err.message }));
    }
  });

  return worker;
}
