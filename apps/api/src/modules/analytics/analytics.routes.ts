import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../lib/auth-middleware.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/vendor/:id/summary', {
    schema: { tags: ['Analytics'], summary: 'Vendor analytics summary' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.get('/vendor/:id/products', {
    schema: { tags: ['Analytics'], summary: 'Vendor product analytics' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: [], error: null }),
  });

  app.get('/admin/overview', {
    schema: { tags: ['Analytics'], summary: 'Platform-wide admin analytics' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  app.post('/reports/generate', {
    schema: { tags: ['Analytics'], summary: 'Queue a report generation job' },
    preHandler: [authenticate],
    handler: async (_req, reply) =>
      reply.status(202).send({ data: { jobId: 'stub', status: 'queued' }, error: null }),
  });
}
