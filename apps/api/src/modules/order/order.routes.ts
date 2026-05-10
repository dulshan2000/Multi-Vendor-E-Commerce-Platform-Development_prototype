import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles, optionalAuthenticate } from '../../lib/auth-middleware.js';
import {
  addressService,
  checkoutService,
  paymentService,
  orderService,
} from './order.service.js';
import {
  createAddressSchema,
  updateAddressSchema,
  checkoutSchema,
  initiatePaymentSchema,
  payHereWebhookSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from './order.schema.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function orderRoutes(app: FastifyInstance) {
  // ── Addresses ─────────────────────────────────────────────────

  app.get('/addresses', {
    schema: { tags: ['Addresses'], summary: 'List saved addresses' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const addresses = await addressService.list(req.user!.userId);
      return reply.send({ data: addresses, meta: null, error: null });
    },
  });

  app.post('/addresses', {
    schema: { tags: ['Addresses'], summary: 'Create a new address (Sri Lanka districts + provinces)', body: zodToJsonSchema(createAddressSchema) },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const address = await addressService.create(req.user!.userId, req.body as Parameters<typeof addressService.create>[1]);
      return reply.status(201).send({ data: address, meta: null, error: null });
    },
  });

  app.patch('/addresses/:id', {
    schema: { tags: ['Addresses'], summary: 'Update an address', body: zodToJsonSchema(updateAddressSchema) },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const address = await addressService.update(id, req.user!.userId, req.body as Parameters<typeof addressService.update>[2]);
      return reply.send({ data: address, meta: null, error: null });
    },
  });

  app.delete('/addresses/:id', {
    schema: { tags: ['Addresses'], summary: 'Delete an address' },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await addressService.delete(id, req.user!.userId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  // ── Checkout ──────────────────────────────────────────────────

  app.get('/checkout/totals', {
    schema: {
      tags: ['Checkout'],
      summary: 'Preview order totals before placing order (LKR — subtotal, shipping, tax)',
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const sessionToken = (req.headers['x-guest-token'] as string) || undefined;
      const totals = await checkoutService.calculateTotals(req.user?.userId, sessionToken);
      return reply.send({ data: totals, meta: null, error: null });
    },
  });

  app.post('/checkout', {
    schema: {
      tags: ['Checkout'],
      summary: 'Place order — splits by vendor, reserves inventory, creates payment record',
      body: zodToJsonSchema(checkoutSchema),
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const sessionToken = (req.headers['x-guest-token'] as string) || undefined;
      const order = await checkoutService.placeOrder(
        req.body as Parameters<typeof checkoutService.placeOrder>[0],
        req.user?.userId,
        sessionToken,
      );
      return reply.status(201).send({ data: order, meta: null, error: null });
    },
  });

  // ── Customer orders ───────────────────────────────────────────

  app.get('/', {
    schema: {
      tags: ['Orders'],
      summary: 'List customer\'s orders',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const q = req.query as { status?: string; page?: number; limit?: number };
      const result = await orderService.listCustomerOrders(req.user!.userId, {
        status: q.status,
        page: q.page ?? 1,
        limit: q.limit ?? 10,
      });
      return reply.send({ data: result.orders, meta: result.meta, error: null });
    },
  });

  app.get('/:id', {
    schema: { tags: ['Orders'], summary: 'Get order by ID' },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const order = await orderService.getOrder(id, req.user?.userId);
      return reply.send({ data: order, meta: null, error: null });
    },
  });

  app.post('/:id/cancel', {
    schema: {
      tags: ['Orders'],
      summary: 'Cancel order (PENDING or CONFIRMED only)',
      body: zodToJsonSchema(cancelOrderSchema),
    },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await orderService.cancelOrder(id, req.user!.userId, req.body as Parameters<typeof orderService.cancelOrder>[2]);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  // ── Vendor order management ───────────────────────────────────

  app.get('/vendor', {
    schema: {
      tags: ['Orders', 'Vendor'],
      summary: 'List vendor\'s sub-orders',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const q = req.query as { status?: string; page?: number; limit?: number };
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
      if (!vendor) return reply.status(404).send({ data: null, meta: null, error: { message: 'Vendor not found' } });
      const result = await orderService.listVendorOrders(vendor.id, { status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
      return reply.send({ data: result.orders, meta: result.meta, error: null });
    },
  });

  app.patch('/vendor/:vendorOrderId/status', {
    schema: {
      tags: ['Orders', 'Vendor'],
      summary: 'Update sub-order status (PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → DELIVERED)',
      body: zodToJsonSchema(updateOrderStatusSchema),
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const { vendorOrderId } = req.params as { vendorOrderId: string };
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
      if (!vendor) return reply.status(404).send({ data: null, meta: null, error: { message: 'Vendor not found' } });
      const updated = await orderService.updateVendorOrderStatus(vendorOrderId, vendor.id, req.body as Parameters<typeof orderService.updateVendorOrderStatus>[2]);
      return reply.send({ data: updated, meta: null, error: null });
    },
  });
}

// ── Payment routes ─────────────────────────────────────────────

export async function paymentRoutes(app: FastifyInstance) {
  // ── Preview totals ────────────────────────────────────────────
  app.post('/initiate', {
    schema: {
      tags: ['Payments'],
      summary: 'Initiate payment for an order (returns PayHere form data or COD confirmation)',
      body: zodToJsonSchema(initiatePaymentSchema),
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const body = req.body as Parameters<typeof paymentService.initiatePayHere>[0] extends string ? { orderId: string; method: string } : never;
      const { orderId, method } = req.body as { orderId: string; method: string };

      if (method === 'PAYHERE') {
        const result = await paymentService.initiatePayHere(orderId, req.user?.userId);
        return reply.send({ data: result, meta: null, error: null });
      }

      if (method === 'COD') {
        const result = await paymentService.initiateCOD(orderId, req.user?.userId);
        return reply.send({ data: result, meta: null, error: null });
      }

      return reply.status(422).send({ data: null, meta: null, error: { message: `Payment method ${method} not yet supported` } });
    },
  });

  // ── PayHere webhook (no auth — verified by MD5 signature) ─────
  app.post('/payhere/webhook', {
    schema: {
      tags: ['Payments'],
      summary: 'PayHere payment notification webhook (signature-verified)',
      // Raw form data from PayHere
      consumes: ['application/x-www-form-urlencoded'],
    },
    handler: async (req, reply) => {
      const body = req.body as Record<string, string>;

      const result = await paymentService.handlePayHereWebhook({
        merchantId: body['merchant_id'] ?? '',
        orderId: body['order_id'] ?? '',
        paymentId: body['payment_id'] ?? '',
        payHereAmount: body['payhere_amount'] ?? '',
        payHereCurrency: body['payhere_currency'] ?? '',
        statusCode: body['status_code'] ?? '',
        md5sig: body['md5sig'] ?? '',
        statusMessage: body['status_message'],
        method: body['method'],
      });

      return reply.send(result);
    },
  });
}
