import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/auth-middleware.js';

export async function cartRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['Cart'], summary: 'Get current cart' },
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.post('/items', {
    schema: { tags: ['Cart'], summary: 'Add item to cart' },
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });

  app.patch('/items/:id', {
    schema: { tags: ['Cart'], summary: 'Update cart item quantity' },
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.delete('/items/:id', {
    schema: { tags: ['Cart'], summary: 'Remove item from cart' },
    handler: async (_req, reply) => reply.status(204).send(),
  });
}
