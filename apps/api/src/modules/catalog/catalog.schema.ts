import { z } from 'zod';

// ── Category ───────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2).max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().optional(),
  imageS3Key: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().omit({ slug: true });

// ── Product ────────────────────────────────────────────────────

const lkrPrice = z
  .number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Price must have at most 2 decimal places');

export const createProductSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(20).max(10000),
  categoryIds: z.array(z.string().cuid()).min(1).max(5),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z
    .object({
      fabric: z.string().optional(),
      fit: z.enum(['SLIM', 'REGULAR', 'LOOSE', 'OVERSIZED']).optional(),
      occasion: z.array(z.string()).optional(),
      careInstructions: z.string().optional(),
      countryOfOrigin: z.string().default('LK'),
      warranty: z.string().optional(),
    })
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1).max(100),
        size: z.string().optional(),
        color: z.string().optional(),
        material: z.string().optional(),
        price: lkrPrice,
        comparePrice: lkrPrice.optional(),
        weight: z.number().positive().optional(),
        dimensions: z
          .object({
            length: z.number().positive(),
            width: z.number().positive(),
            height: z.number().positive(),
          })
          .optional(),
        isDefault: z.boolean().default(false),
        initialStock: z.number().int().min(0).default(0),
        lowStockThreshold: z.number().int().min(0).default(5),
      }),
    )
    .min(1, 'At least one variant is required'),
});

export const updateProductSchema = createProductSchema
  .omit({ variants: true })
  .partial();

export const updateProductStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
});

// ── Product variant ────────────────────────────────────────────

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(100),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  price: lkrPrice,
  comparePrice: lkrPrice.optional(),
  weight: z.number().positive().optional(),
  isDefault: z.boolean().default(false),
  initialStock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const updateVariantSchema = createVariantSchema
  .omit({ sku: true, initialStock: true })
  .partial();

// ── Inventory ─────────────────────────────────────────────────

export const adjustInventorySchema = z.object({
  variantId: z.string().cuid(),
  adjustment: z.number().int(),
  reason: z.enum(['RESTOCK', 'SALE_CORRECTION', 'DAMAGE', 'RETURN', 'MANUAL']),
  note: z.string().max(200).optional(),
});

export const bulkInventoryUpdateSchema = z.object({
  updates: z.array(adjustInventorySchema).min(1).max(100),
});

// ── Product image ──────────────────────────────────────────────

export const productImageUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  isPrimary: z.boolean().default(false),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

// ── Bulk import ────────────────────────────────────────────────

export const bulkImportSchema = z.object({
  s3Key: z.string().min(1),           // CSV uploaded to S3
  options: z.object({
    updateExisting: z.boolean().default(false),
    defaultStatus: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
  }).optional(),
});

// ── Product review ─────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: z.string().cuid(),
  orderId: z.string().cuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(10).max(2000).optional(),
});

// Types
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type BulkInventoryUpdateInput = z.infer<typeof bulkInventoryUpdateSchema>;
export type ProductImageUploadInput = z.infer<typeof productImageUploadSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
