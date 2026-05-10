import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../../lib/auth-middleware.js';
import { cartService } from './cart.service.js';

const addItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
});

const updateQtySchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export async function cartRoutes(app: FastifyInstance) {
  // Helper to extract customerId / sessionToken from request
  const getCartId = (req: { user?: { userId: string }; headers: Record<string, string | string[] | undefined> }) => ({
    customerId: req.user?.userId,
    sessionToken: req.headers['x-guest-token'] as string | undefined,
  });

  // ── GET /api/v1/cart ─────────────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Cart'],
      summary: 'Get current cart (auth or guest)',
      description: 'Pass `X-Guest-Token` header for guest carts. Auth users get DB-persisted cart.',
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const cart = await cartService.getCart(getCartId(req));
      return reply.send({ data: cart, meta: null, error: null });
    },
  });

  // ── POST /api/v1/cart/items ───────────────────────────────────
  app.post('/items', {
    schema: {
      tags: ['Cart'],
      summary: 'Add item to cart (validates stock in LKR)',
      body: {
        type: 'object',
        required: ['variantId', 'quantity'],
        properties: {
          variantId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1, maximum: 99 },
        },
      },
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const body = addItemSchema.parse(req.body);
      const cart = await cartService.addItem(getCartId(req), body.variantId, body.quantity);
      return reply.status(201).send({ data: cart, meta: null, error: null });
    },
  });

  // ── PATCH /api/v1/cart/items/:variantId ───────────────────────
  app.patch('/items/:variantId', {
    schema: {
      tags: ['Cart'],
      summary: 'Update item quantity (set to 0 to remove)',
      body: {
        type: 'object',
        required: ['quantity'],
        properties: { quantity: { type: 'integer', minimum: 0, maximum: 99 } },
      },
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const { variantId } = req.params as { variantId: string };
      const body = updateQtySchema.parse(req.body);
      const cart = await cartService.updateQuantity(getCartId(req), variantId, body.quantity);
      return reply.send({ data: cart, meta: null, error: null });
    },
  });

  // ── DELETE /api/v1/cart/items/:variantId ──────────────────────
  app.delete('/items/:variantId', {
    schema: { tags: ['Cart'], summary: 'Remove item from cart' },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const { variantId } = req.params as { variantId: string };
      const cart = await cartService.removeItem(getCartId(req), variantId);
      return reply.send({ data: cart, meta: null, error: null });
    },
  });

  // ── DELETE /api/v1/cart ───────────────────────────────────────
  app.delete('/', {
    schema: { tags: ['Cart'], summary: 'Clear entire cart' },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const cart = await cartService.clearCart(getCartId(req));
      return reply.send({ data: cart, meta: null, error: null });
    },
  });

  // ── POST /api/v1/cart/merge ───────────────────────────────────
  app.post('/merge', {
    schema: {
      tags: ['Cart'],
      summary: 'Merge guest cart into authenticated user cart (call after login)',
      body: {
        type: 'object',
        required: ['sessionToken'],
        properties: { sessionToken: { type: 'string' } },
      },
    },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { sessionToken } = req.body as { sessionToken: string };
      await cartService.mergeGuestCartOnLogin(sessionToken, req.user!.userId);
      const cart = await cartService.getCart({ customerId: req.user!.userId });
      return reply.send({ data: cart, meta: null, error: null });
    },
  });
}
