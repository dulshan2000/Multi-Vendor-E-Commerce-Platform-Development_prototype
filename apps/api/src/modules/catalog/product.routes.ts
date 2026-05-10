import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/auth-middleware.js';

export async function productRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['Products'], summary: 'List products with filters' },
    handler: async (_req, reply) => reply.send({ data: [], meta: { total: 0 }, error: null }),
  });

  app.post('/', {
    schema: { tags: ['Products'], summary: 'Create a product (vendor)' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });

  app.get('/:id', {
    schema: { tags: ['Products'], summary: 'Get product by ID' },
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.patch('/:id', {
    schema: { tags: ['Products'], summary: 'Update product' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.delete('/:id', {
    schema: { tags: ['Products'], summary: 'Delete product' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.status(204).send(),
  });

  app.post('/bulk-import', {
    schema: { tags: ['Products'], summary: 'Bulk import products via CSV' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.status(202).send({ data: { jobId: 'stub' }, error: null }),
  });

  app.get('/:id/variants', {
    schema: { tags: ['Products'], summary: 'Get product variants' },
    handler: async (_req, reply) => reply.send({ data: [], error: null }),
  });
}
