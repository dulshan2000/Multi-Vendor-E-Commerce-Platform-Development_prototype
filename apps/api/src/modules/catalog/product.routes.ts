import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles, optionalAuthenticate } from '../../lib/auth-middleware.js';
import { categoryService, productService, inventoryService } from './catalog.service.js';
import { searchProducts } from '../../lib/elasticsearch.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  createVariantSchema,
  updateVariantSchema,
  adjustInventorySchema,
  bulkInventoryUpdateSchema,
  productImageUploadSchema,
  bulkImportSchema,
  createReviewSchema,
} from './catalog.schema.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/v1/categories — Public category tree
  app.get('/', {
    schema: { tags: ['Categories'], summary: 'Get full category tree' },
    handler: async (_req, reply) => {
      const tree = await categoryService.getTree();
      return reply.send({ data: tree, meta: null, error: null });
    },
  });

  // GET /api/v1/categories/:slug — Category by slug
  app.get('/:slug', {
    schema: { tags: ['Categories'], summary: 'Get category by slug' },
    handler: async (req: Parameters<typeof categoryService.getBySlug>[0] extends string ? never : { params: { slug: string } }, reply) => {
      const cat = await categoryService.getBySlug((req as { params: { slug: string } }).params.slug);
      return reply.send({ data: cat, meta: null, error: null });
    },
  });

  // POST /api/v1/categories — Admin: create
  app.post('/', {
    schema: { tags: ['Categories'], summary: 'Create a category (admin)', body: zodToJsonSchema(createCategorySchema) },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const cat = await categoryService.create((req as { body: Parameters<typeof categoryService.create>[0] }).body);
      return reply.status(201).send({ data: cat, meta: null, error: null });
    },
  });

  // PATCH /api/v1/categories/:id
  app.patch('/:id', {
    schema: { tags: ['Categories'], summary: 'Update a category (admin)', body: zodToJsonSchema(updateCategorySchema) },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof categoryService.update>[1] };
      const cat = await categoryService.update(r.params.id, r.body);
      return reply.send({ data: cat, meta: null, error: null });
    },
  });

  // DELETE /api/v1/categories/:id
  app.delete('/:id', {
    schema: { tags: ['Categories'], summary: 'Delete a category (admin)' },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string } };
      const result = await categoryService.delete(r.params.id);
      return reply.send({ data: result, meta: null, error: null });
    },
  });
}

export async function productRoutes(app: FastifyInstance) {
  // ── Search (Elasticsearch) ───────────────────────────────────
  app.get('/search', {
    schema: {
      tags: ['Products', 'Search'],
      summary: 'Search products with Elasticsearch (filters, facets, full-text)',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          categoryId: { type: 'string' },
          vendorId: { type: 'string' },
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
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const q = req.query as Parameters<typeof searchProducts>[0];
      const result = await searchProducts({ ...q, page: q.page ?? 1, limit: q.limit ?? 24 });
      return reply.send({
        data: result.hits,
        meta: { total: result.total, page: result.page, limit: result.limit, aggregations: result.aggregations },
        error: null,
      });
    },
  });

  // ── Vendor: Create product ────────────────────────────────────
  app.post('/', {
    schema: {
      tags: ['Products'],
      summary: 'Create a product (vendor)',
      body: zodToJsonSchema(createProductSchema),
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { body: Parameters<typeof productService.create>[1]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const product = await productService.create(vendorId, r.body);
      return reply.status(201).send({ data: product, meta: null, error: null });
    },
  });

  // ── List vendor products ──────────────────────────────────────
  app.get('/vendor', {
    schema: {
      tags: ['Products'],
      summary: 'List vendor\'s own products',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'] },
          search: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { query: { status?: string; search?: string; page?: number; limit?: number }; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const result = await productService.listByVendor(vendorId, {
        status: r.query.status as Parameters<typeof productService.listByVendor>[1]['status'],
        search: r.query.search,
        page: r.query.page ?? 1,
        limit: r.query.limit ?? 20,
      });
      return reply.send({ data: result.products, meta: result.meta, error: null });
    },
  });

  // ── Get product by ID ─────────────────────────────────────────
  app.get('/:id', {
    schema: { tags: ['Products'], summary: 'Get product details' },
    preHandler: [optionalAuthenticate],
    handler: async (req, reply) => {
      const r = req as { params: { id: string } };
      const product = await productService.getById(r.params.id);
      return reply.send({ data: product, meta: null, error: null });
    },
  });

  // ── Update product ────────────────────────────────────────────
  app.patch('/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Update product details',
      body: zodToJsonSchema(updateProductSchema),
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof productService.update>[2]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const product = await productService.update(r.params.id, vendorId, r.body);
      return reply.send({ data: product, meta: null, error: null });
    },
  });

  // ── Update product status ────────────────────────────────────
  app.patch('/:id/status', {
    schema: {
      tags: ['Products'],
      summary: 'Update product status (DRAFT → ACTIVE → ARCHIVED)',
      body: zodToJsonSchema(updateProductStatusSchema),
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: { status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' }; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const product = await productService.setStatus(r.params.id, vendorId, r.body.status);
      return reply.send({ data: product, meta: null, error: null });
    },
  });

  // ── Delete product ────────────────────────────────────────────
  app.delete('/:id', {
    schema: { tags: ['Products'], summary: 'Delete a product (vendor)' },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const result = await productService.delete(r.params.id, vendorId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  // ── Variants ──────────────────────────────────────────────────
  app.post('/:id/variants', {
    schema: { tags: ['Products', 'Variants'], summary: 'Add a product variant', body: zodToJsonSchema(createVariantSchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof productService.addVariant>[2]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const variant = await productService.addVariant(r.params.id, vendorId, r.body);
      return reply.status(201).send({ data: variant, meta: null, error: null });
    },
  });

  app.patch('/:id/variants/:variantId', {
    schema: { tags: ['Products', 'Variants'], summary: 'Update a product variant', body: zodToJsonSchema(updateVariantSchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string; variantId: string }; body: Parameters<typeof productService.updateVariant>[2]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const variant = await productService.updateVariant(r.params.variantId, vendorId, r.body);
      return reply.send({ data: variant, meta: null, error: null });
    },
  });

  // ── Images ────────────────────────────────────────────────────
  app.post('/:id/images/upload-url', {
    schema: { tags: ['Products', 'Images'], summary: 'Get presigned S3 upload URL for a product image', body: zodToJsonSchema(productImageUploadSchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof productService.getImageUploadUrl>[2]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const result = await productService.getImageUploadUrl(r.params.id, vendorId, r.body);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  app.post('/:id/images/confirm', {
    schema: {
      tags: ['Products', 'Images'],
      summary: 'Confirm image upload (after S3 upload, register in DB)',
      body: {
        type: 'object',
        required: ['s3Key'],
        properties: {
          s3Key: { type: 'string' },
          isPrimary: { type: 'boolean', default: false },
          altText: { type: 'string' },
          sortOrder: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof productService.confirmImageUpload>[2]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const image = await productService.confirmImageUpload(r.params.id, vendorId, r.body);
      return reply.status(201).send({ data: image, meta: null, error: null });
    },
  });

  app.delete('/:id/images/:imageId', {
    schema: { tags: ['Products', 'Images'], summary: 'Delete a product image' },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { params: { id: string; imageId: string }; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const result = await productService.deleteImage(r.params.imageId, vendorId);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  // ── Inventory ─────────────────────────────────────────────────
  app.post('/inventory/adjust', {
    schema: { tags: ['Products', 'Inventory'], summary: 'Adjust inventory for a variant', body: zodToJsonSchema(adjustInventorySchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { body: Parameters<typeof inventoryService.adjust>[0] };
      const result = await inventoryService.adjust(r.body);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  app.post('/inventory/bulk-adjust', {
    schema: { tags: ['Products', 'Inventory'], summary: 'Bulk adjust inventory (up to 100 variants)', body: zodToJsonSchema(bulkInventoryUpdateSchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { body: Parameters<typeof inventoryService.bulkAdjust>[0] };
      const result = await inventoryService.bulkAdjust(r.body);
      return reply.send({ data: result, meta: null, error: null });
    },
  });

  app.get('/inventory/low-stock', {
    schema: { tags: ['Products', 'Inventory'], summary: 'Get low-stock items for vendor' },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER', 'VENDOR_STAFF')],
    handler: async (req, reply) => {
      const r = req as { user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const items = await inventoryService.getLowStockItems(vendorId);
      return reply.send({ data: items, meta: null, error: null });
    },
  });

  // ── Bulk import ────────────────────────────────────────────────
  app.post('/bulk-import', {
    schema: { tags: ['Products'], summary: 'Bulk import products from CSV (via S3 key)', body: zodToJsonSchema(bulkImportSchema) },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: async (req, reply) => {
      const r = req as { body: Parameters<typeof productService.queueBulkImport>[1]; user: { userId: string } };
      const vendorId = await getVendorIdForUser(r.user.userId);
      const result = await productService.queueBulkImport(vendorId, r.body);
      return reply.status(202).send({ data: result, meta: null, error: null });
    },
  });

  // ── Reviews ────────────────────────────────────────────────────
  app.post('/:id/reviews', {
    schema: { tags: ['Products', 'Reviews'], summary: 'Submit a product review', body: zodToJsonSchema(createReviewSchema) },
    preHandler: [authenticate],
    handler: async (req, reply) => {
      const r = req as { params: { id: string }; body: Parameters<typeof productService.createReview>[1]; user: { userId: string } };
      const review = await productService.createReview(r.user.userId, { ...r.body, productId: r.params.id });
      return reply.status(201).send({ data: review, meta: null, error: null });
    },
  });
}

// ── Helper: Get vendorId from userId ──────────────────────────

import { PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';

const prisma = new PrismaClient();

async function getVendorIdForUser(userId: string): Promise<string> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!vendor) throw new AppError(ErrorCodes.NOT_FOUND, 'No vendor account found for this user', 404);
  return vendor.id;
}
