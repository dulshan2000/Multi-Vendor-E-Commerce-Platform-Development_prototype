import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles, optionalAuthenticate } from '../../lib/auth-middleware.js';
import { flashSaleService, createFlashSaleSchema } from './flash-sale.service.js';
import { recentlyViewedService, trendingService } from '../catalog/recently-viewed.service.js';
import { reportQueue } from '../../lib/queue.js';
import { redis } from '../../lib/redis.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export async function flashSaleRoutes(app: FastifyInstance) {
  // ── Public: active flash sales ────────────────────────────────
  app.get('/active', {
    schema: { tags: ['FlashSales'], summary: 'Get currently active flash sales with discounted LKR prices' },
    handler: async (_req, reply) => {
      const sales = await flashSaleService.getActive();
      return reply.send({ data: sales, meta: { count: sales.length }, error: null });
    },
  });

  app.get('/', {
    schema: {
      tags: ['FlashSales', 'Admin'],
      summary: 'List all flash sales (admin)',
      querystring: { type: 'object', properties: { includeExpired: { type: 'boolean', default: false }, page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 20 } } },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const q = req.query as { includeExpired?: boolean; page?: number; limit?: number };
      const result = await flashSaleService.list({ page: q.page ?? 1, limit: q.limit ?? 20, includeExpired: q.includeExpired });
      return reply.send({ data: result.sales, meta: result.meta, error: null });
    },
  });

  app.post('/', {
    schema: { tags: ['FlashSales', 'Admin'], summary: 'Create flash sale with variant-level discounts', body: zodToJsonSchema(createFlashSaleSchema) },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const sale = await flashSaleService.create(req.body as Parameters<typeof flashSaleService.create>[0], req.user!.userId);
      return reply.status(201).send({ data: sale, meta: null, error: null });
    },
  });

  app.patch('/:id/toggle', {
    schema: { tags: ['FlashSales', 'Admin'], summary: 'Toggle flash sale active/inactive' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const sale = await flashSaleService.toggleActive(id);
      return reply.send({ data: sale, meta: null, error: null });
    },
  });
}

// ── Recently Viewed & Trending ─────────────────────────────────

export async function behavioralRoutes(app: FastifyInstance) {
  // Track product view (called by PDP on load)
  app.post('/track/view/:productId', {
    schema: { tags: ['Behavioral'], summary: 'Track product view for recently-viewed + trending' },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const { productId } = req.params as { productId: string };
      const guestToken = req.headers['x-guest-token'] as string | undefined;
      await recentlyViewedService.track(productId, req.user?.userId, guestToken);
      return reply.send({ data: { tracked: true }, meta: null, error: null });
    },
  });

  app.get('/recently-viewed', {
    schema: {
      tags: ['Behavioral'],
      summary: 'Get recently viewed products (auth or guest)',
      querystring: { type: 'object', properties: { limit: { type: 'integer', default: 10, maximum: 20 } } },
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const q = req.query as { limit?: number };
      const guestToken = req.headers['x-guest-token'] as string | undefined;
      const items = await recentlyViewedService.get(req.user?.userId, guestToken, q.limit ?? 10);
      return reply.send({ data: items, meta: { count: items.length }, error: null });
    },
  });

  app.get('/trending', {
    schema: {
      tags: ['Behavioral'],
      summary: 'Get trending products (1-hour rolling window view counts)',
      querystring: { type: 'object', properties: { limit: { type: 'integer', default: 10, maximum: 20 } } },
    },
    handler: async (req, reply) => {
      const q = req.query as { limit?: number };
      const products = await trendingService.getTopTrending(q.limit ?? 10);
      return reply.send({ data: products, meta: { count: products.length }, error: null });
    },
  });
}

// ── Report Generation ──────────────────────────────────────────

const reportRequestSchema = z.object({
  type: z.enum(['VENDOR_ORDERS', 'PLATFORM_GMV', 'SETTLEMENT_HISTORY']),
  format: z.enum(['CSV', 'XLSX']).default('CSV'),
  period: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  vendorId: z.string().cuid().optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  // Submit report job
  app.post('/generate', {
    schema: {
      tags: ['Reports', 'Admin'],
      summary: 'Queue a CSV/XLSX report (VENDOR_ORDERS, PLATFORM_GMV, SETTLEMENT_HISTORY). Poll /status/:requestId',
      body: zodToJsonSchema(reportRequestSchema),
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN', 'VENDOR_OWNER')],
    handler: async (req, reply) => {
      const body = req.body as z.infer<typeof reportRequestSchema>;
      const requestId = randomUUID();

      await reportQueue.add('generate', {
        ...body,
        adminId: req.user!.userId,
        requestId,
      });

      return reply.status(202).send({
        data: { requestId, message: 'Report queued. Poll /reports/status/:requestId to check progress.' },
        meta: null,
        error: null,
      });
    },
  });

  // Poll report status
  app.get('/status/:requestId', {
    schema: { tags: ['Reports'], summary: 'Check report generation status' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { requestId } = req.params as { requestId: string };
      const status = await redis.get(`report:status:${requestId}`);
      if (!status) return reply.status(404).send({ data: null, error: { message: 'Report not found or expired' } });
      return reply.send({ data: JSON.parse(status), meta: null, error: null });
    },
  });

  // Download completed report
  app.get('/download/:requestId', {
    schema: { tags: ['Reports'], summary: 'Download generated CSV report' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { requestId } = req.params as { requestId: string };
      const [statusRaw, csv] = await Promise.all([
        redis.get(`report:status:${requestId}`),
        redis.get(`report:result:${requestId}`),
      ]);
      const status = statusRaw ? JSON.parse(statusRaw) : null;
      if (!status || status.status !== 'DONE' || !csv) {
        return reply.status(404).send({ data: null, error: { message: 'Report not ready or expired (24h limit)' } });
      }
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="report-${requestId}.csv"`);
      return reply.send(csv);
    },
  });
}
