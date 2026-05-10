import { redis } from '../../lib/redis.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../lib/logger.js';

const prisma = new PrismaClient();

const RECENTLY_VIEWED_KEY = (userId: string) => `recently_viewed:${userId}`;
const GUEST_RECENTLY_VIEWED_KEY = (sessionId: string) => `rv_guest:${sessionId}`;
const TRENDING_KEY = 'trending:products';
const MAX_RECENT = 20;
const TRENDING_WINDOW_SECONDS = 3600; // 1 hour rolling window

// ── Recently Viewed ────────────────────────────────────────────

export const recentlyViewedService = {
  async track(productId: string, userId?: string, guestToken?: string) {
    const key = userId ? RECENTLY_VIEWED_KEY(userId) : guestToken ? GUEST_RECENTLY_VIEWED_KEY(guestToken) : null;
    if (!key) return;

    const score = Date.now();
    await redis.zadd(key, score, productId);
    // Trim to last MAX_RECENT items
    await redis.zremrangebyrank(key, 0, -(MAX_RECENT + 1));
    // TTL: 30 days
    await redis.expire(key, 30 * 24 * 60 * 60);

    // Also increment trending score
    await redis.zincrby(TRENDING_KEY, 1, productId);
    await redis.expire(TRENDING_KEY, TRENDING_WINDOW_SECONDS);
  },

  async get(userId?: string, guestToken?: string, limit = 10): Promise<{ id: string; title: string; slug: string; price: number; imageUrl?: string }[]> {
    const key = userId ? RECENTLY_VIEWED_KEY(userId) : guestToken ? GUEST_RECENTLY_VIEWED_KEY(guestToken) : null;
    if (!key) return [];

    // Get last N product IDs (newest first)
    const productIds = await redis.zrevrange(key, 0, limit - 1);
    if (productIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      select: {
        id: true, title: true, slug: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        variants: { take: 1, select: { price: true } },
      },
    });

    // Preserve Redis order (newest first)
    const productMap = new Map(products.map((p) => [p.id, p]));
    return productIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        title: p!.title,
        slug: p!.slug,
        price: Number(p!.variants[0]?.price ?? 0),
        imageUrl: p!.images[0]?.url,
      }));
  },

  async mergeGuestToUser(guestToken: string, userId: string) {
    const guestKey = GUEST_RECENTLY_VIEWED_KEY(guestToken);
    const userKey = RECENTLY_VIEWED_KEY(userId);
    const guestItems = await redis.zrangebyscore(guestKey, '-inf', '+inf', 'WITHSCORES');
    if (guestItems.length === 0) return;

    // ZADD all guest items to user key preserving scores
    const pipeline = redis.pipeline();
    for (let i = 0; i < guestItems.length; i += 2) {
      pipeline.zadd(userKey, parseInt(guestItems[i + 1]), guestItems[i]);
    }
    pipeline.zremrangebyrank(userKey, 0, -(MAX_RECENT + 1));
    pipeline.expire(userKey, 30 * 24 * 60 * 60);
    pipeline.del(guestKey);
    await pipeline.exec();
    logger.debug({ userId, guestToken }, 'Merged guest recently viewed to user');
  },
};

// ── Trending Products ──────────────────────────────────────────

export const trendingService = {
  async getTopTrending(limit = 10) {
    const productIds = await redis.zrevrange(TRENDING_KEY, 0, limit - 1);
    if (productIds.length === 0) {
      // Fallback: most ordered in last 7 days
      const topSellers = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limit,
      });
      return Promise.all(topSellers.map(async (ts) =>
        prisma.product.findUnique({
          where: { id: ts.productId! },
          select: {
            id: true, title: true, slug: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            variants: { take: 1, select: { price: true } },
            vendor: { select: { businessName: true } },
          },
        }),
      )).then((ps) => ps.filter(Boolean));
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      select: {
        id: true, title: true, slug: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        variants: { take: 1, select: { price: true } },
        vendor: { select: { businessName: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => productMap.get(id)).filter(Boolean);
  },

  async incrementView(productId: string) {
    await redis.zincrby(TRENDING_KEY, 1, productId);
    await redis.expire(TRENDING_KEY, TRENDING_WINDOW_SECONDS);
  },
};
