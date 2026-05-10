import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../lib/redis.js';

const prisma = new PrismaClient();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: {
      tags: ['System'],
      summary: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: { type: 'object' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const services: Record<string, 'ok' | 'error'> = {};

      // Check DB
      try {
        await prisma.$queryRaw`SELECT 1`;
        services['database'] = 'ok';
      } catch {
        services['database'] = 'error';
      }

      // Check Redis
      try {
        await redis.ping();
        services['redis'] = 'ok';
      } catch {
        services['redis'] = 'error';
      }

      const allHealthy = Object.values(services).every((s) => s === 'ok');

      return reply.status(allHealthy ? 200 : 503).send({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
        version: process.env['npm_package_version'] ?? '0.1.0',
      });
    },
  });
}
