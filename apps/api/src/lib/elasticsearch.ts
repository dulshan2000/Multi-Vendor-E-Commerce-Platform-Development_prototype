import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  ...(env.ELASTICSEARCH_API_KEY && {
    auth: { apiKey: env.ELASTICSEARCH_API_KEY },
  }),
});

// ── Index names ────────────────────────────────────────────────
export const INDICES = {
  PRODUCTS: 'markcomm_products',
  VENDORS: 'markcomm_vendors',
} as const;

// ── Product index mapping ──────────────────────────────────────

export const PRODUCT_INDEX_MAPPING = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      vendorId: { type: 'keyword' },
      vendorName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      vendorSlug: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'search_as_you_type' },
        },
      },
      description: { type: 'text', analyzer: 'english' },
      status: { type: 'keyword' },
      tags: { type: 'keyword' },
      categoryIds: { type: 'keyword' },
      categoryNames: { type: 'keyword' },
      rating: { type: 'float' },
      reviewCount: { type: 'integer' },
      salesCount: { type: 'integer' },

      // Variants / pricing (LKR)
      minPrice: { type: 'float' },
      maxPrice: { type: 'float' },
      currency: { type: 'keyword' },
      colors: { type: 'keyword' },
      sizes: { type: 'keyword' },
      materials: { type: 'keyword' },
      isInStock: { type: 'boolean' },
      totalStock: { type: 'integer' },

      // Images
      primaryImageUrl: { type: 'keyword', index: false },

      // Metadata (Sri Lanka-specific)
      fabric: { type: 'keyword' },
      fit: { type: 'keyword' },
      occasion: { type: 'keyword' },
      countryOfOrigin: { type: 'keyword' },

      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        english: {
          type: 'standard',
          stopwords: '_english_',
        },
      },
    },
  },
};

// ── Ensure indices exist ───────────────────────────────────────

export async function ensureIndices(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: INDICES.PRODUCTS });
    if (!exists) {
      await esClient.indices.create({
        index: INDICES.PRODUCTS,
        ...PRODUCT_INDEX_MAPPING,
      });
      logger.info({ index: INDICES.PRODUCTS }, 'Elasticsearch index created');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to ensure Elasticsearch indices');
    // Non-fatal — app continues without search
  }
}

// ── Index a product ───────────────────────────────────────────

export interface ProductDocument {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  categoryIds: string[];
  categoryNames: string[];
  rating: number;
  reviewCount: number;
  salesCount: number;
  minPrice: number;
  maxPrice: number;
  currency: 'LKR';
  colors: string[];
  sizes: string[];
  materials: string[];
  isInStock: boolean;
  totalStock: number;
  primaryImageUrl: string | null;
  fabric?: string;
  fit?: string;
  occasion?: string[];
  countryOfOrigin: string;
  createdAt: string;
  updatedAt: string;
}

export async function indexProduct(doc: ProductDocument): Promise<void> {
  try {
    await esClient.index({
      index: INDICES.PRODUCTS,
      id: doc.id,
      document: doc,
    });
  } catch (error) {
    logger.error({ error, productId: doc.id }, 'Failed to index product in Elasticsearch');
    // Non-fatal
  }
}

export async function removeProductFromIndex(productId: string): Promise<void> {
  try {
    await esClient.delete({ index: INDICES.PRODUCTS, id: productId });
  } catch (error) {
    logger.warn({ productId }, 'Product not found in index during removal');
  }
}

// ── Search ────────────────────────────────────────────────────

export interface SearchParams {
  q?: string;
  categoryId?: string;
  vendorId?: string;
  vendorSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  rating?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'rating';
  page: number;
  limit: number;
}

export async function searchProducts(params: SearchParams) {
  const { q, categoryId, vendorId, vendorSlug, minPrice, maxPrice,
    size, color, rating, inStock, sort = 'relevance', page, limit } = params;

  const must: unknown[] = [{ term: { status: 'ACTIVE' } }];
  const filter: unknown[] = [];

  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: ['title^3', 'description', 'tags^2', 'vendorName'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  if (categoryId) filter.push({ term: { categoryIds: categoryId } });
  if (vendorId) filter.push({ term: { vendorId } });
  if (vendorSlug) filter.push({ term: { vendorSlug } });
  if (color) filter.push({ term: { colors: color } });
  if (size) filter.push({ term: { sizes: size } });
  if (inStock !== undefined) filter.push({ term: { isInStock: inStock } });
  if (rating) filter.push({ range: { rating: { gte: rating } } });
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.push({ range: { minPrice: { ...(minPrice && { gte: minPrice }), ...(maxPrice && { lte: maxPrice }) } } });
  }

  const sortMap: Record<string, unknown> = {
    relevance: [{ _score: 'desc' }, { salesCount: 'desc' }],
    price_asc: [{ minPrice: 'asc' }],
    price_desc: [{ maxPrice: 'desc' }],
    newest: [{ createdAt: 'desc' }],
    best_selling: [{ salesCount: 'desc' }],
    rating: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  };

  const response = await esClient.search({
    index: INDICES.PRODUCTS,
    from: (page - 1) * limit,
    size: limit,
    query: { bool: { must, filter } },
    sort: sortMap[sort] as never,
    aggs: {
      colors: { terms: { field: 'colors', size: 30 } },
      sizes: { terms: { field: 'sizes', size: 30 } },
      categories: { terms: { field: 'categoryIds', size: 20 } },
      priceRange: {
        stats: { field: 'minPrice' },
      },
    },
    _source: {
      excludes: ['description'],
    },
    highlight: {
      fields: { title: {} },
    },
  });

  const hits = response.hits.hits.map((hit) => ({
    ...(hit._source as ProductDocument),
    _score: hit._score,
    _highlight: hit.highlight,
  }));

  return {
    hits,
    total: typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total,
    aggregations: response.aggregations,
    page,
    limit,
  };
}
