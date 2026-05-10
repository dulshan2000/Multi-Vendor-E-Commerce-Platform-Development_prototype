import { PrismaClient, type Prisma } from '@prisma/client';
import { redis } from '../../lib/redis.js';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const FLASH_SALE_KEY = (id: string) => `flash:sale:${id}`;
const ACTIVE_FLASH_KEY = 'flash:active';

// ── Schema ─────────────────────────────────────────────────────

export const createFlashSaleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(300).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  items: z.array(z.object({
    variantId: z.string().cuid(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive(),
    stockLimit: z.number().int().positive().optional(), // max units at flash price
  })).min(1),
});

export type CreateFlashSaleInput = z.infer<typeof createFlashSaleSchema>;

// ── Flash Sale Service ─────────────────────────────────────────

export const flashSaleService = {
  async create(data: CreateFlashSaleInput, adminId: string) {
    if (data.endsAt <= data.startsAt) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'endsAt must be after startsAt', 422);
    }

    const sale = await prisma.flashSale.create({
      data: {
        name: data.name,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        createdByAdminId: adminId,
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            discountType: item.discountType,
            discountValue: item.discountValue,
            stockLimit: item.stockLimit ?? null,
            soldCount: 0,
          })),
        },
      },
      include: { items: { include: { variant: { select: { sku: true, price: true } } } } },
    });

    // Cache in Redis for quick lookup during checkout
    const ttl = Math.floor((data.endsAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await redis.setex(FLASH_SALE_KEY(sale.id), ttl, JSON.stringify(sale));
      await redis.zadd(ACTIVE_FLASH_KEY, data.endsAt.getTime(), sale.id);
    }

    logger.info({ saleId: sale.id }, 'Flash sale created');
    return sale;
  },

  async getActive() {
    const now = Date.now();
    // Clean expired from sorted set
    await redis.zremrangebyscore(ACTIVE_FLASH_KEY, '-inf', now);
    const activeSaleIds = await redis.zrangebyscore(ACTIVE_FLASH_KEY, now, '+inf');

    if (activeSaleIds.length === 0) {
      // Fallback to DB
      return prisma.flashSale.findMany({
        where: { startsAt: { lte: new Date() }, endsAt: { gt: new Date() }, isActive: true },
        include: {
          items: {
            include: {
              variant: {
                select: {
                  id: true, sku: true, price: true, comparePrice: true,
                  product: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
                },
              },
            },
          },
        },
        orderBy: { endsAt: 'asc' },
      });
    }

    const sales = await Promise.all(
      activeSaleIds.map(async (id) => {
        const cached = await redis.get(FLASH_SALE_KEY(id));
        if (cached) return JSON.parse(cached);
        return prisma.flashSale.findUnique({
          where: { id },
          include: { items: { include: { variant: { select: { id: true, sku: true, price: true } } } } },
        });
      }),
    );

    return sales.filter(Boolean);
  },

  async getFlashPriceForVariant(variantId: string): Promise<{ flashPrice: number; saleId: string; endsAt: Date } | null> {
    const now = new Date();
    const saleItem = await prisma.flashSaleItem.findFirst({
      where: {
        variantId,
        flashSale: { startsAt: { lte: now }, endsAt: { gt: now }, isActive: true },
        OR: [{ stockLimit: null }, { soldCount: { lt: prisma.flashSaleItem.fields.stockLimit as unknown as number } }],
      },
      include: { variant: { select: { price: true } }, flashSale: { select: { id: true, endsAt: true } } },
    });

    if (!saleItem) return null;

    const originalPrice = Number(saleItem.variant.price);
    let flashPrice: number;
    if (saleItem.discountType === 'PERCENTAGE') {
      flashPrice = originalPrice * (1 - Number(saleItem.discountValue) / 100);
    } else {
      flashPrice = Math.max(0, originalPrice - Number(saleItem.discountValue));
    }

    return {
      flashPrice: Math.round(flashPrice * 100) / 100,
      saleId: saleItem.flashSale.id,
      endsAt: saleItem.flashSale.endsAt,
    };
  },

  async list(params: { page: number; limit: number; includeExpired?: boolean }) {
    const { page, limit, includeExpired } = params;
    const where: Prisma.FlashSaleWhereInput = includeExpired ? {} : { endsAt: { gt: new Date() } };
    const [sales, total] = await Promise.all([
      prisma.flashSale.findMany({ where, include: { _count: { select: { items: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { startsAt: 'desc' } }),
      prisma.flashSale.count({ where }),
    ]);
    return { sales, meta: { total, page, limit } };
  },

  async toggleActive(id: string) {
    const sale = await prisma.flashSale.findUnique({ where: { id } });
    if (!sale) throw new AppError(ErrorCodes.NOT_FOUND, 'Flash sale not found', 404);
    return prisma.flashSale.update({ where: { id }, data: { isActive: !sale.isActive } });
  },
};
