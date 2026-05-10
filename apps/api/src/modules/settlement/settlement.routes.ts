import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../lib/auth-middleware.js';

export async function settlementRoutes(app: FastifyInstance) {
  app.get('/ledger', {
    schema: { tags: ['Settlements'], summary: 'Get vendor ledger entries' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: [], meta: { total: 0 }, error: null }),
  });

  app.post('/payout/request', {
    schema: { tags: ['Settlements'], summary: 'Request a payout withdrawal' },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });

  app.get('/payout/history', {
    schema: { tags: ['Settlements'], summary: 'Get payout history' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: [], meta: { total: 0 }, error: null }),
  });
}
