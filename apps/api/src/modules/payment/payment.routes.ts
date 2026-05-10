import type { FastifyInstance } from 'fastify';

/**
 * Payment routes — Sri Lanka-first strategy:
 * Primary: PayHere (payhere.lk) — most widely used Sri Lankan payment gateway
 * Secondary: Stripe — for international cards, Apple Pay, Google Pay
 * Regional digital wallets: Dialog Genie, FriMi, Sampath Vishwa
 *
 * All gateway credentials stored in AWS Secrets Manager — never in codebase.
 */
export async function paymentRoutes(app: FastifyInstance) {
  // Create payment session (returns PayHere or Stripe payment data)
  app.post('/checkout/session', {
    schema: { tags: ['Payments'], summary: 'Create payment session' },
    handler: async (_req, reply) =>
      reply.status(201).send({
        data: {
          gateway: 'payhere',
          // PayHere requires these fields for their hosted checkout
          merchantId: 'stub',
          orderId: 'stub',
          amount: '0.00',
          currency: 'LKR',
          hash: 'stub',
          notifyUrl: 'stub',
          returnUrl: 'stub',
          cancelUrl: 'stub',
        },
        error: null,
      }),
  });

  // PayHere webhook — called by PayHere servers after payment
  app.post('/webhooks/payhere', {
    schema: { tags: ['Payments'], summary: 'PayHere payment notification webhook' },
    handler: async (_req, reply) => reply.send({ status: 'ok' }),
  });

  // Stripe webhook — called by Stripe after international card payments
  app.post('/webhooks/stripe', {
    schema: { tags: ['Payments'], summary: 'Stripe payment event webhook' },
    config: { rawBody: true }, // Stripe requires raw body for signature verification
    handler: async (_req, reply) => reply.send({ received: true }),
  });

  // Get available payment methods (filtered by country/region)
  app.get('/methods', {
    schema: { tags: ['Payments'], summary: 'Get available payment methods for Sri Lanka' },
    handler: async (_req, reply) =>
      reply.send({
        data: {
          methods: [
            { id: 'payhere_card', name: 'Credit/Debit Card', gateway: 'payhere', available: true },
            { id: 'payhere_ezcash', name: 'eZ Cash', gateway: 'payhere', available: true },
            { id: 'payhere_mcash', name: 'mCash', gateway: 'payhere', available: true },
            { id: 'dialog_genie', name: 'Dialog Genie', gateway: 'genie', available: true },
            { id: 'frimi', name: 'FriMi', gateway: 'frimi', available: true },
            { id: 'stripe_card', name: 'International Card', gateway: 'stripe', available: true },
            { id: 'stripe_apple_pay', name: 'Apple Pay', gateway: 'stripe', available: true },
            { id: 'stripe_google_pay', name: 'Google Pay', gateway: 'stripe', available: true },
            { id: 'cod', name: 'Cash on Delivery', gateway: 'internal', available: true },
          ],
          currency: 'LKR',
        },
        error: null,
      }),
  });
}
