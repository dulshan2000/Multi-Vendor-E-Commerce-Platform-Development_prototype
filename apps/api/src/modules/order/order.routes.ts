import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/auth-middleware.js';

export async function orderRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['Orders'], summary: 'List orders (customer: own, vendor: their items, admin: all)' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: [], meta: { total: 0 }, error: null }),
  });

  app.post('/', {
    schema: { tags: ['Orders'], summary: 'Place an order' },
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });

  app.get('/:id', {
    schema: { tags: ['Orders'], summary: 'Get order by ID' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.post('/:id/cancel', {
    schema: { tags: ['Orders'], summary: 'Cancel an order' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.post('/:id/fulfill', {
    schema: { tags: ['Orders'], summary: 'Fulfill an order item (vendor)' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.post('/:id/return', {
    schema: { tags: ['Orders'], summary: 'Request a return' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });
}
