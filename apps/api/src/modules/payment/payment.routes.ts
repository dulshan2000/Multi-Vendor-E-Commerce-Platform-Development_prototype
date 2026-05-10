import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * Payment routes — Sri Lanka-first strategy:
 * Primary:  PayHere (payhere.lk) — most widely used Sri Lankan gateway
 * Dev/Test: MOCK_PAYMENTS=true skips all real gateways
 * Secondary: COD, Stripe (international)
 */
export async function paymentRoutes(app: FastifyInstance) {

  // ── Available payment methods ──────────────────────────────────
  app.get('/methods', {
    schema: { tags: ['Payments'], summary: 'Available payment methods for Sri Lanka' },
    handler: async (_req, reply) => reply.send({
      data: {
        mockMode: env.MOCK_PAYMENTS,
        currency: 'LKR',
        methods: [
          {
            id: 'cod',
            name: 'Cash on Delivery',
            nameLocal: 'බාර ගැනීමේදී ගෙවීම',
            description: 'Pay when your order arrives',
            gateway: 'internal',
            available: true,
            icon: '💵',
          },
          {
            id: 'payhere_card',
            name: 'Credit / Debit Card',
            nameLocal: 'ක්‍රෙඩිට් / ඩෙබිට් කාඩ්',
            description: 'Visa, Mastercard, AMEX via PayHere',
            gateway: 'payhere',
            available: !env.MOCK_PAYMENTS || true,
            sandboxNote: env.PAYHERE_SANDBOX ? 'Sandbox mode — use test card 4916217501611292' : undefined,
            icon: '💳',
          },
          {
            id: 'payhere_ezcash',
            name: 'eZ Cash (Dialog)',
            gateway: 'payhere',
            available: true,
            icon: '📱',
          },
          {
            id: 'payhere_mcash',
            name: 'mCash (Mobitel)',
            gateway: 'payhere',
            available: true,
            icon: '📲',
          },
          {
            id: 'dialog_genie',
            name: 'Dialog Genie',
            gateway: 'genie',
            available: !!env.GENIE_API_KEY,
            icon: '🧞',
          },
          {
            id: 'frimi',
            name: 'FriMi (Nations Trust Bank)',
            gateway: 'frimi',
            available: !!env.FRIMI_API_KEY,
            icon: '🏦',
          },
          {
            id: 'mock',
            name: '🧪 Test Payment (Dev only)',
            description: 'Instantly confirms order — development only',
            gateway: 'mock',
            available: env.MOCK_PAYMENTS && env.NODE_ENV !== 'production',
            devOnly: true,
            icon: '🧪',
          },
        ],
      },
      error: null,
    }),
  });

  // ── Create checkout session ────────────────────────────────────
  app.post('/checkout/session', {
    schema: { tags: ['Payments'], summary: 'Create payment session (PayHere or COD)' },
    handler: async (req: any, reply) => {
      const { orderId, method = 'cod' } = req.body ?? {};
      if (!orderId) return reply.status(400).send({ data: null, error: 'orderId required' });

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true, address: true },
      });
      if (!order) return reply.status(404).send({ data: null, error: 'Order not found' });

      if (method === 'cod') {
        // COD — confirm immediately
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentMethod: 'COD', paymentStatus: 'PENDING', status: 'VENDOR_ACCEPTED' },
        });
        return reply.send({ data: { gateway: 'cod', status: 'confirmed' }, error: null });
      }

      if (method === 'mock' && env.MOCK_PAYMENTS) {
        // Mock — instantly confirm for dev testing
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentMethod: 'MOCK', paymentStatus: 'PAID', status: 'VENDOR_ACCEPTED' },
        });
        return reply.send({ data: { gateway: 'mock', status: 'paid', redirectUrl: `${env.APP_URL}/orders/${orderId}/success` }, error: null });
      }

      // PayHere — return form data for client-side redirect
      const { buildPayHereFormData, PAYHERE_CHECKOUT_URL } = await import('../../lib/payhere.js');
      const formData = buildPayHereFormData({
        orderId: order.id,
        orderDescription: `MarkComm Order #${order.orderNumber}`,
        itemsDescription: `Order #${order.orderNumber}`,
        amountLKR: Number(order.total),
        customerFirstName: order.customer.firstName ?? 'Customer',
        customerLastName: order.customer.lastName ?? '',
        customerEmail: order.customer.email,
        customerPhone: '+94771234567',
        shippingAddress1: order.address?.addressLine1 ?? 'Colombo',
        shippingCity: order.address?.city ?? 'Colombo',
        shippingDistrict: order.address?.state ?? 'Colombo',
        returnUrl: `${env.APP_URL}/orders/${order.id}/success`,
        cancelUrl: `${env.APP_URL}/checkout?cancelled=1`,
        notifyUrl: `${env.API_URL}/api/v1/payments/webhooks/payhere`,
      });

      return reply.send({ data: { gateway: 'payhere', checkoutUrl: PAYHERE_CHECKOUT_URL, formData }, error: null });
    },
  });

  // ── 🧪 Mock payment confirm (dev only) ─────────────────────────
  // POST /api/v1/payments/mock-confirm  { orderId }
  // Instantly marks order as PAID — use in tests and Postman
  app.post('/mock-confirm', {
    schema: { tags: ['Payments'], summary: '🧪 DEV: Instantly confirm payment (MOCK_PAYMENTS=true only)' },
    handler: async (req: any, reply) => {
      if (!env.MOCK_PAYMENTS || env.NODE_ENV === 'production') {
        return reply.status(403).send({ data: null, error: 'Mock payments disabled' });
      }

      const { orderId } = req.body ?? {};
      if (!orderId) return reply.status(400).send({ data: null, error: 'orderId required' });

      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: 'MOCK',
          paymentStatus: 'PAID',
          status: 'VENDOR_ACCEPTED',
        },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true },
      });

      logger.info({ orderId, orderNumber: order.orderNumber }, '🧪 Mock payment confirmed');

      return reply.send({
        data: {
          order,
          message: `Order #${order.orderNumber} confirmed via mock payment`,
          nextStep: `Visit /orders/${orderId} to track`,
        },
        error: null,
      });
    },
  });

  // ── PayHere webhook ────────────────────────────────────────────
  app.post('/webhooks/payhere', {
    schema: { tags: ['Payments'], summary: 'PayHere IPN webhook' },
    handler: async (req: any, reply) => {
      if (!env.PAYHERE_MERCHANT_SECRET || env.PAYHERE_MERCHANT_SECRET === 'sandbox_secret') {
        logger.warn('PayHere webhook received but no merchant secret configured — skipping verification');
        return reply.send({ status: 'ok' });
      }

      const { verifyPayHereWebhook, interpretPayHereStatus } = await import('../../lib/payhere.js');
      const body = req.body as Record<string, string>;

      const valid = verifyPayHereWebhook({
        merchantId: body.merchant_id,
        orderId: body.order_id,
        payHereAmount: body.payhere_amount,
        payHereCurrency: body.payhere_currency,
        statusCode: body.status_code,
        md5sig: body.md5sig,
        merchantSecret: env.PAYHERE_MERCHANT_SECRET,
      });

      if (!valid) return reply.status(400).send({ error: 'Invalid signature' });

      const status = interpretPayHereStatus(body.status_code);

      if (status === 'SUCCESS') {
        await prisma.order.update({
          where: { orderNumber: body.order_id },
          data: { paymentStatus: 'PAID', status: 'VENDOR_ACCEPTED', paymentMethod: 'PAYHERE' },
        });
        logger.info({ orderId: body.order_id }, 'PayHere payment confirmed');
      }

      return reply.send({ status: 'ok' });
    },
  });

  // ── Stripe webhook ─────────────────────────────────────────────
  app.post('/webhooks/stripe', {
    schema: { tags: ['Payments'], summary: 'Stripe payment event webhook' },
    config: { rawBody: true },
    handler: async (_req, reply) => reply.send({ received: true }),
  });
}
