import type { FastifyInstance } from 'fastify';
import { searchProducts } from '../../lib/elasticsearch.js';
import { optionalAuthenticate } from '../../lib/auth-middleware.js';

export async function searchRoutes(app: FastifyInstance) {
  // ── Full-text product search ──────────────────────────────────
  app.get('/products', {
    schema: {
      tags: ['Search'],
      summary: 'Search products using Elasticsearch — full-text, faceted, sorted',
      description:
        'Powered by Elasticsearch 8. Supports fuzzy matching, faceted filters (color, size, price), ' +
        'and aggregations. All prices are in LKR.',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Full-text search query' },
          categoryId: { type: 'string' },
          vendorId: { type: 'string' },
          vendorSlug: { type: 'string' },
          minPrice: { type: 'number', description: 'Minimum price in LKR' },
          maxPrice: { type: 'number', description: 'Maximum price in LKR' },
          size: { type: 'string' },
          color: { type: 'string' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          inStock: { type: 'boolean' },
          sort: {
            type: 'string',
            enum: ['relevance', 'price_asc', 'price_desc', 'newest', 'best_selling', 'rating'],
            default: 'relevance',
          },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
        },
      },
    },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const q = req.query as Parameters<typeof searchProducts>[0];
      const result = await searchProducts({ ...q, page: q.page ?? 1, limit: q.limit ?? 24 });
      return reply.send({
        data: result.hits,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          aggregations: result.aggregations,
        },
        error: null,
      });
    },
  });

  // ── Autocomplete / type-ahead ─────────────────────────────────
  app.get('/suggest', {
    schema: {
      tags: ['Search'],
      summary: 'Search-as-you-type product name suggestions',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2 },
          limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
        },
      },
    },
    handler: async (req, reply) => {
      const { q, limit = 5 } = req.query as { q: string; limit?: number };
      const result = await searchProducts({ q, page: 1, limit, sort: 'relevance' });
      const suggestions = result.hits.map((h) => ({
        id: h.id,
        title: h.title,
        primaryImageUrl: h.primaryImageUrl,
        minPrice: h.minPrice,
        currency: 'LKR',
      }));
      return reply.send({ data: suggestions, meta: null, error: null });
    },
  });
}
