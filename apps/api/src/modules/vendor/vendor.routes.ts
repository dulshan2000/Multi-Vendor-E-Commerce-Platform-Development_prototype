import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../lib/auth-middleware.js';

export async function vendorRoutes(app: FastifyInstance) {
  // GET /api/v1/vendors — Admin: list all vendors
  app.get('/', {
    schema: { tags: ['Vendors'], summary: 'List all vendors (admin)' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (_req, reply) => reply.send({ data: [], meta: { total: 0 }, error: null }),
  });

  // POST /api/v1/vendors — Register new vendor
  app.post('/', {
    schema: { tags: ['Vendors'], summary: 'Register as a vendor' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.status(201).send({ data: null, error: null }),
  });

  // GET /api/v1/vendors/:id — Vendor profile
  app.get('/:id', {
    schema: { tags: ['Vendors'], summary: 'Get vendor profile' },
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  // PATCH /api/v1/vendors/:id — Update vendor profile
  app.patch('/:id', {
    schema: { tags: ['Vendors'], summary: 'Update vendor profile' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  // POST /api/v1/vendors/:id/approve — Admin: approve vendor
  app.post('/:id/approve', {
    schema: { tags: ['Vendors'], summary: 'Approve a vendor (admin)' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  // POST /api/v1/vendors/:id/suspend — Admin: suspend vendor
  app.post('/:id/suspend', {
    schema: { tags: ['Vendors'], summary: 'Suspend a vendor (admin)' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });

  // GET /api/v1/vendors/:id/analytics — Vendor analytics
  app.get('/:id/analytics', {
    schema: { tags: ['Vendors'], summary: 'Get vendor analytics' },
    preHandler: [authenticate],
    handler: async (_req, reply) => reply.send({ data: null, error: null }),
  });
}
