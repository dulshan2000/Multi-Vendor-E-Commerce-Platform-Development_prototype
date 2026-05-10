import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../lib/auth-middleware.js';
import { settlementService, analyticsService } from './settlement.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function settlementRoutes(app: FastifyInstance) {
  // ── Vendor: view own balance & settlements ────────────────────
  app.get('/balance', {
    schema: { tags: ['Settlement'], summary: 'Get vendor pending payout balance (LKR, 10% commission deducted)' },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: async (req, reply) => {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
      if (!vendor) return reply.status(404).send({ data: null, meta: null, error: { message: 'Vendor not found' } });
      const balance = await settlementService.calculateVendorBalance(vendor.id);
      return reply.send({ data: balance, meta: null, error: null });
    },
  });

  app.get('/my', {
    schema: {
      tags: ['Settlement'],
      summary: 'List vendor\'s settlement history',
      querystring: { type: 'object', properties: { page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 10 } } },
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: async (req, reply) => {
      const q = req.query as { page?: number; limit?: number };
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
      if (!vendor) return reply.status(404).send({ data: null, meta: null, error: { message: 'Vendor not found' } });
      const result = await settlementService.listVendorSettlements(vendor.id, { page: q.page ?? 1, limit: q.limit ?? 10 });
      return reply.send({ data: result.settlements, meta: result.meta, error: null });
    },
  });

  // ── Admin: list all settlements ───────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Settlement', 'Admin'],
      summary: 'List all vendor settlements (admin)',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED'] },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const q = req.query as { status?: string; page?: number; limit?: number };
      const result = await settlementService.listAllSettlements({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
      return reply.send({ data: result.settlements, meta: result.meta, error: null });
    },
  });

  app.post('/vendor/:vendorId', {
    schema: { tags: ['Settlement', 'Admin'], summary: 'Create settlement (payout) for a vendor (admin)' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const { vendorId } = req.params as { vendorId: string };
      const settlement = await settlementService.createSettlement(vendorId, req.user!.userId);
      return reply.status(201).send({ data: settlement, meta: null, error: null });
    },
  });

  app.patch('/:settlementId/pay', {
    schema: {
      tags: ['Settlement', 'Admin'],
      summary: 'Mark settlement as paid with bank transfer reference (admin)',
      body: {
        type: 'object',
        required: ['reference'],
        properties: { reference: { type: 'string', minLength: 3, maxLength: 100 } },
      },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const { settlementId } = req.params as { settlementId: string };
      const { reference } = req.body as { reference: string };
      const updated = await settlementService.markSettlementPaid(settlementId, req.user!.userId, reference);
      return reply.send({ data: updated, meta: null, error: null });
    },
  });
}

export async function analyticsRoutes(app: FastifyInstance) {
  // ── Platform analytics (admin) ────────────────────────────────
  app.get('/platform', {
    schema: {
      tags: ['Analytics', 'Admin'],
      summary: 'Platform-wide analytics: GMV, commission, top vendors, daily chart (admin)',
      querystring: {
        type: 'object',
        properties: { period: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' } },
      },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const q = req.query as { period?: '7d' | '30d' | '90d' };
      const overview = await analyticsService.getPlatformOverview(q.period ?? '30d');
      return reply.send({ data: overview, meta: null, error: null });
    },
  });

  // ── Vendor analytics ──────────────────────────────────────────
  app.get('/vendor', {
    schema: {
      tags: ['Analytics', 'Vendor'],
      summary: 'Vendor dashboard analytics: revenue, orders, top products',
      querystring: {
        type: 'object',
        properties: { period: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' } },
      },
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const q = req.query as { period?: '7d' | '30d' | '90d' };
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
      if (!vendor) return reply.status(404).send({ data: null, meta: null, error: { message: 'Vendor not found' } });
      const analytics = await analyticsService.getVendorAnalytics(vendor.id, q.period ?? '30d');
      return reply.send({ data: analytics, meta: null, error: null });
    },
  });
}
