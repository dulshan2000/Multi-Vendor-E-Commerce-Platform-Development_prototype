import type { FastifyInstance } from 'fastify';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/products', {
    schema: {
      tags: ['Search'],
      summary: 'Search products (Elasticsearch-backed)',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          category: { type: 'string' },
          vendorSlug: { type: 'string' },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          size: { type: 'string' },
          color: { type: 'string' },
          rating: { type: 'number' },
          inStock: { type: 'boolean' },
          sort: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'newest', 'best_selling', 'rating'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
        },
      },
    },
    handler: async (_req, reply) =>
      reply.send({ data: { hits: [], total: 0, facets: {} }, meta: { page: 1, limit: 24 }, error: null }),
  });
}
