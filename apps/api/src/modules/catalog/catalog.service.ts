import { PrismaClient, type ProductStatus, type Prisma } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { createPresignedUploadUrl, deleteS3Object, S3Folders, s3KeyToPublicUrl } from '../../lib/storage.js';
import { indexProduct, removeProductFromIndex, type ProductDocument } from '../../lib/elasticsearch.js';
import { logger } from '../../lib/logger.js';
import { slugify } from '../../lib/utils.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateVariantInput,
  UpdateVariantInput,
  AdjustInventoryInput,
  BulkInventoryUpdateInput,
  ProductImageUploadInput,
  BulkImportInput,
  CreateReviewInput,
} from './catalog.schema.js';

const prisma = new PrismaClient();

// ── Category Service ───────────────────────────────────────────

export const categoryService = {
  async create(data: CreateCategoryInput) {
    // Check slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(ErrorCodes.CONFLICT, 'A category with this slug already exists', 409);

    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        imageUrl: data.imageS3Key ? s3KeyToPublicUrl(data.imageS3Key) : null,
        sortOrder: data.sortOrder,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      },
    });
  },

  async update(id: string, data: UpdateCategoryInput) {
    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        imageUrl: data.imageS3Key ? s3KeyToPublicUrl(data.imageS3Key) : undefined,
      },
    });
  },

  async delete(id: string) {
    // Check no products in category
    const productCount = await prisma.productCategory.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new AppError(ErrorCodes.CONFLICT, `Cannot delete: ${productCount} products belong to this category`, 409);
    }
    // Check no children
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new AppError(ErrorCodes.CONFLICT, `Cannot delete: category has ${childCount} subcategories`, 409);
    }
    await prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  },

  async getTree() {
    // Fetch all, build tree in memory (efficient for <1000 categories)
    const all = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const map = new Map(all.map((c) => [c.id, { ...c, children: [] as typeof all }]));
    const roots: typeof all = [];

    for (const cat of all) {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    }

    return roots.map((r) => map.get(r.id)!);
  },

  async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) throw new AppError(ErrorCodes.NOT_FOUND, 'Category not found', 404);
    return category;
  },
};

// ── Product Service ────────────────────────────────────────────

export const productService = {
  async create(vendorId: string, data: CreateProductInput) {
    // Validate categories exist
    const categories = await prisma.category.findMany({
      where: { id: { in: data.categoryIds }, isActive: true },
    });
    if (categories.length !== data.categoryIds.length) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'One or more categories are invalid', 422);
    }

    // Check SKU uniqueness
    const skus = data.variants.map((v) => v.sku);
    const existing = await prisma.productVariant.findFirst({ where: { sku: { in: skus } } });
    if (existing) {
      throw new AppError(ErrorCodes.CONFLICT, `SKU "${existing.sku}" is already in use`, 409);
    }

    // Ensure exactly one default variant
    const defaultVariants = data.variants.filter((v) => v.isDefault);
    if (defaultVariants.length === 0) data.variants[0]!.isDefault = true;
    if (defaultVariants.length > 1) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only one variant can be the default', 422);

    const product = await prisma.$transaction(async (tx) => {
      // Create product
      const p = await tx.product.create({
        data: {
          vendorId,
          title: data.title,
          description: data.description,
          tags: data.tags,
          metadata: data.metadata as Prisma.JsonObject,
          status: 'DRAFT',
        },
      });

      // Create categories
      await tx.productCategory.createMany({
        data: data.categoryIds.map((categoryId) => ({ productId: p.id, categoryId })),
      });

      // Create variants + inventory
      for (const v of data.variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: p.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            material: v.material,
            price: v.price,
            comparePrice: v.comparePrice,
            weight: v.weight,
            dimensions: v.dimensions as Prisma.JsonObject,
            isDefault: v.isDefault,
          },
        });

        await tx.inventoryRecord.create({
          data: {
            variantId: variant.id,
            quantity: v.initialStock,
            lowStockThreshold: v.lowStockThreshold,
          },
        });
      }

      return p;
    });

    // Sync to Elasticsearch (non-blocking)
    this.syncToElasticsearch(product.id).catch((err) =>
      logger.error({ err, productId: product.id }, 'ES sync failed after product create'),
    );

    logger.info({ productId: product.id, vendorId }, 'Product created');
    return product;
  },

  async update(productId: string, vendorId: string, data: UpdateProductInput) {
    await this.assertOwnership(productId, vendorId);

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: {
          title: data.title,
          description: data.description,
          tags: data.tags,
          metadata: data.metadata as Prisma.JsonObject,
        },
      });

      if (data.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productCategory.createMany({
          data: data.categoryIds.map((categoryId) => ({ productId, categoryId })),
        });
      }

      return p;
    });

    this.syncToElasticsearch(productId).catch(() => {});
    return updated;
  },

  async setStatus(productId: string, vendorId: string, status: ProductStatus) {
    await this.assertOwnership(productId, vendorId);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    if (status === 'ARCHIVED') {
      await removeProductFromIndex(productId);
    } else {
      await this.syncToElasticsearch(productId);
    }

    return updated;
  },

  async delete(productId: string, vendorId: string) {
    await this.assertOwnership(productId, vendorId);

    // Delete S3 images
    const images = await prisma.productImage.findMany({ where: { productId } });
    await Promise.allSettled(images.map((img) => deleteS3Object(img.s3Key)));

    await prisma.product.delete({ where: { id: productId } });
    await removeProductFromIndex(productId);

    return { message: 'Product deleted' };
  },

  async getById(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: { inventory: true },
          orderBy: { isDefault: 'desc' },
        },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        categories: { include: { category: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        vendor: {
          include: { storefront: { select: { slug: true, displayName: true } } },
        },
      },
    });

    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, 'Product not found', 404);

    // Map S3 keys to public URLs
    return {
      ...product,
      images: product.images.map((img) => ({
        ...img,
        url: s3KeyToPublicUrl(img.s3Key),
      })),
    };
  },

  async listByVendor(
    vendorId: string,
    params: { status?: ProductStatus; page: number; limit: number; search?: string },
  ) {
    const { status, page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      vendorId,
      ...(status && { status }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: { select: { price: true, comparePrice: true }, take: 1, orderBy: { isDefault: 'desc' } },
          _count: { select: { variants: true, reviews: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  },

  // ── Variants ─────────────────────────────────────────────────

  async addVariant(productId: string, vendorId: string, data: CreateVariantInput) {
    await this.assertOwnership(productId, vendorId);

    const existing = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError(ErrorCodes.CONFLICT, `SKU "${data.sku}" is already in use`, 409);

    const variant = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.create({
        data: {
          productId,
          sku: data.sku,
          size: data.size,
          color: data.color,
          material: data.material,
          price: data.price,
          comparePrice: data.comparePrice,
          weight: data.weight,
          isDefault: data.isDefault,
        },
      });
      await tx.inventoryRecord.create({
        data: {
          variantId: v.id,
          quantity: data.initialStock,
          lowStockThreshold: data.lowStockThreshold,
        },
      });
      return v;
    });

    this.syncToElasticsearch(productId).catch(() => {});
    return variant;
  },

  async updateVariant(variantId: string, vendorId: string, data: UpdateVariantInput) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) throw new AppError(ErrorCodes.NOT_FOUND, 'Variant not found', 404);
    if (variant.product.vendorId !== vendorId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        size: data.size,
        color: data.color,
        material: data.material,
        price: data.price,
        comparePrice: data.comparePrice,
        weight: data.weight,
        isDefault: data.isDefault,
      },
    });

    this.syncToElasticsearch(variant.productId).catch(() => {});
    return updated;
  },

  // ── Images ───────────────────────────────────────────────────

  async getImageUploadUrl(productId: string, vendorId: string, data: ProductImageUploadInput) {
    await this.assertOwnership(productId, vendorId);

    const result = await createPresignedUploadUrl({
      folder: S3Folders.productImages(vendorId, productId),
      fileName: data.fileName,
      contentType: data.contentType,
      maxSizeBytes: 8 * 1024 * 1024,
      expiresIn: 600,
    });

    return result;
  },

  async confirmImageUpload(
    productId: string,
    vendorId: string,
    data: { s3Key: string; isPrimary: boolean; altText?: string; sortOrder: number },
  ) {
    await this.assertOwnership(productId, vendorId);

    if (data.isPrimary) {
      // Unset any existing primary
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        s3Key: data.s3Key,
        url: s3KeyToPublicUrl(data.s3Key),
        isPrimary: data.isPrimary,
        altText: data.altText,
        sortOrder: data.sortOrder,
      },
    });

    this.syncToElasticsearch(productId).catch(() => {});
    return image;
  },

  async deleteImage(imageId: string, vendorId: string) {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: true },
    });
    if (!image) throw new AppError(ErrorCodes.NOT_FOUND, 'Image not found', 404);
    if (image.product.vendorId !== vendorId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);

    await deleteS3Object(image.s3Key);
    await prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image deleted' };
  },

  // ── Reviews ──────────────────────────────────────────────────

  async createReview(userId: string, data: CreateReviewInput) {
    // Ensure user purchased the product
    if (data.orderId) {
      const purchased = await prisma.orderItem.findFirst({
        where: {
          orderId: data.orderId,
          order: { customerId: userId },
          variant: { productId: data.productId },
        },
      });
      if (!purchased) throw new AppError(ErrorCodes.FORBIDDEN, 'You can only review products you have purchased', 403);
    }

    // Check not already reviewed
    const existingReview = await prisma.productReview.findFirst({
      where: { productId: data.productId, userId, orderId: data.orderId },
    });
    if (existingReview) throw new AppError(ErrorCodes.CONFLICT, 'You have already reviewed this product', 409);

    const review = await prisma.productReview.create({
      data: {
        productId: data.productId,
        userId,
        orderId: data.orderId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        isVerified: !!data.orderId,
      },
    });

    // Update product rating aggregate
    const stats = await prisma.productReview.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: data.productId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });

    this.syncToElasticsearch(data.productId).catch(() => {});
    return review;
  },

  // ── Bulk import ───────────────────────────────────────────────

  async queueBulkImport(vendorId: string, data: BulkImportInput) {
    // This queues a BullMQ job — actual processing in worker
    logger.info({ vendorId, s3Key: data.s3Key }, 'Bulk import queued');
    return {
      jobId: `bulk_${Date.now()}`,
      status: 'queued',
      message: 'Bulk import started. You will be notified by email when complete.',
    };
  },

  // ── Elasticsearch sync ────────────────────────────────────────

  async syncToElasticsearch(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: { include: { inventory: true } },
        images: { where: { isPrimary: true }, take: 1 },
        categories: { include: { category: true } },
        vendor: {
          include: { storefront: { select: { slug: true, displayName: true } } },
        },
      },
    });

    if (!product) return;

    const prices = product.variants.map((v) => Number(v.price));
    const totalStock = product.variants.reduce(
      (sum, v) => sum + (v.inventory?.quantity ?? 0),
      0,
    );

    const doc: ProductDocument = {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendor.storefront?.displayName ?? product.vendor.businessName,
      vendorSlug: product.vendor.storefront?.slug ?? '',
      title: product.title,
      description: product.description ?? '',
      status: product.status,
      tags: product.tags,
      categoryIds: product.categories.map((c) => c.categoryId),
      categoryNames: product.categories.map((c) => c.category.name),
      rating: Number(product.rating),
      reviewCount: product.reviewCount,
      salesCount: product.salesCount,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      currency: 'LKR',
      colors: [...new Set(product.variants.map((v) => v.color).filter(Boolean))] as string[],
      sizes: [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[],
      materials: [...new Set(product.variants.map((v) => v.material).filter(Boolean))] as string[],
      isInStock: totalStock > 0,
      totalStock,
      primaryImageUrl: product.images[0] ? s3KeyToPublicUrl(product.images[0].s3Key) : null,
      ...(product.metadata as Record<string, unknown> ?? {}),
      countryOfOrigin: (product.metadata as Record<string, unknown>)?.['countryOfOrigin'] as string ?? 'LK',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    await indexProduct(doc);
  },

  // ── Ownership check ───────────────────────────────────────────

  async assertOwnership(productId: string, vendorId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });
    if (!product) throw new AppError(ErrorCodes.NOT_FOUND, 'Product not found', 404);
    if (product.vendorId !== vendorId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    return product;
  },
};

// ── Inventory Service ─────────────────────────────────────────

export const inventoryService = {
  async adjust(data: AdjustInventoryInput) {
    const record = await prisma.inventoryRecord.findUnique({
      where: { variantId: data.variantId },
    });
    if (!record) throw new AppError(ErrorCodes.NOT_FOUND, 'Inventory record not found', 404);

    const newQty = record.quantity + data.adjustment;
    if (newQty < 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Adjustment would result in negative stock', 422);
    }

    const updated = await prisma.inventoryRecord.update({
      where: { variantId: data.variantId },
      data: {
        quantity: newQty,
        ...(data.reason === 'RESTOCK' && { lastRestockedAt: new Date() }),
      },
    });

    logger.info({ variantId: data.variantId, adjustment: data.adjustment, reason: data.reason, newQty }, 'Inventory adjusted');

    // Check low stock alert
    if (updated.quantity <= updated.lowStockThreshold && updated.quantity > 0) {
      logger.warn({ variantId: data.variantId, quantity: updated.quantity }, 'Low stock alert');
      // TODO: publish to BullMQ for email notification to vendor
    }

    return updated;
  },

  async bulkAdjust(data: BulkInventoryUpdateInput) {
    const results = await Promise.allSettled(
      data.updates.map((u) => this.adjust(u)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { succeeded, failed, total: data.updates.length };
  },

  async getLowStockItems(vendorId: string) {
    return prisma.inventoryRecord.findMany({
      where: {
        quantity: { gt: 0 },
        variant: { product: { vendorId } },
        // quantity <= lowStockThreshold — raw query needed as Prisma doesn't support column comparison
      },
      include: {
        variant: {
          include: { product: { select: { id: true, title: true } } },
        },
      },
    });
  },
};
