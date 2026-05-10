import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles, optionalAuthenticate } from '../../lib/auth-middleware.js';
import { couponService, returnService, wishlistService } from './marketing.service.js';
import {
  createCouponSchema, validateCouponSchema,
  createReturnSchema, updateReturnSchema, addToWishlistSchema,
} from './marketing.schema.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function couponRoutes(app: FastifyInstance) {
  // ── Validate / apply coupon (public) ──────────────────────────
  app.post('/validate', {
    schema: { tags: ['Coupons'], summary: 'Validate a coupon code and calculate discount (LKR)', body: zodToJsonSchema(validateCouponSchema) },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const result = await couponService.validate(req.body as Parameters<typeof couponService.validate>[0], req.user?.userId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  // ── Admin: CRUD ───────────────────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Coupons', 'Admin'],
      summary: 'List all coupons',
      querystring: { type: 'object', properties: { isActive: { type: 'boolean' }, page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 20 } } },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const q = req.query as { isActive?: boolean; page?: number; limit?: number };
      const result = await couponService.list({ isActive: q.isActive, page: q.page ?? 1, limit: q.limit ?? 20 });
      return reply.send({ data: result.coupons, meta: result.meta, error: null });
    },
  });

  app.post('/', {
    schema: { tags: ['Coupons', 'Admin'], summary: 'Create coupon (PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING)', body: zodToJsonSchema(createCouponSchema) },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const coupon = await couponService.create(req.body as Parameters<typeof couponService.create>[0], req.user!.userId);
      return reply.status(201).send({ data: coupon, meta: null, error: null });
    },
  });

  app.patch('/:id/toggle', {
    schema: { tags: ['Coupons', 'Admin'], summary: 'Toggle coupon active/inactive' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const coupon = await couponService.toggle(id);
      return reply.send({ data: coupon, meta: null, error: null });
    },
  });
}

export async function returnRoutes(app: FastifyInstance) {
  // ── Customer: create return ───────────────────────────────────
  app.post('/', {
    schema: {
      tags: ['Returns'],
      summary: 'Request a return for delivered order items (7-day window)',
      body: zodToJsonSchema(createReturnSchema),
    },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const returnReq = await returnService.create(req.body as Parameters<typeof returnService.create>[0], req.user!.userId);
      return reply.status(201).send({ data: returnReq, meta: null, error: null });
    },
  });

  app.get('/my', {
    schema: {
      tags: ['Returns'],
      summary: 'List customer return requests',
      querystring: { type: 'object', properties: { page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 10 } } },
    },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const q = req.query as { page?: number; limit?: number };
      const result = await returnService.listCustomer(req.user!.userId, { page: q.page ?? 1, limit: q.limit ?? 10 });
      return reply.send({ data: result.returns, meta: result.meta, error: null });
    },
  });

  // ── Admin: list + update return status ────────────────────────
  app.get('/', {
    schema: {
      tags: ['Returns', 'Admin'],
      summary: 'List all return requests',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'ITEMS_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'RESOLVED'] },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const q = req.query as { status?: string; page?: number; limit?: number };
      const result = await returnService.listAdmin({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
      return reply.send({ data: result.returns, meta: result.meta, error: null });
    },
  });

  app.patch('/:id', {
    schema: {
      tags: ['Returns', 'Admin'],
      summary: 'Update return status — APPROVED restores inventory, REFUND_COMPLETED triggers payment',
      body: zodToJsonSchema(updateReturnSchema),
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const updated = await returnService.update(id, req.body as Parameters<typeof returnService.update>[1], req.user!.userId);
      return reply.send({ data: updated, meta: null, error: null });
    },
  });
}

export async function wishlistRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['Wishlist'], summary: 'Get wishlist with product details + LKR prices' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const items = await wishlistService.get(req.user!.userId);
      return reply.send({ data: items, meta: { count: items.length }, error: null });
    },
  });

  app.post('/', {
    schema: { tags: ['Wishlist'], summary: 'Add product to wishlist', body: zodToJsonSchema(addToWishlistSchema) },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { productId } = req.body as { productId: string };
      const item = await wishlistService.add(req.user!.userId, productId);
      return reply.status(201).send({ data: item, meta: null, error: null });
    },
  });

  app.delete('/:productId', {
    schema: { tags: ['Wishlist'], summary: 'Remove product from wishlist' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { productId } = req.params as { productId: string };
      const result = await wishlistService.remove(req.user!.userId, productId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  app.get('/check/:productId', {
    schema: { tags: ['Wishlist'], summary: 'Check if product is in wishlist' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { productId } = req.params as { productId: string };
      const result = await wishlistService.isInWishlist(req.user!.userId, productId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });
}
