import { PrismaClient, type Prisma } from '@prisma/client';
import { redis } from '../../lib/redis.js';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { logger } from '../../lib/logger.js';

const prisma = new PrismaClient();

// ── Cart keys ──────────────────────────────────────────────────
const guestCartKey = (sessionToken: string) => `guest_cart:${sessionToken}`;
const GUEST_CART_TTL = 7 * 24 * 3600; // 7 days

interface CartItemData {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

interface GuestCart {
  items: CartItemData[];
  updatedAt: string;
}

// ── Guest cart (Redis) ─────────────────────────────────────────

const guestCartService = {
  async get(sessionToken: string): Promise<GuestCart> {
    const raw = await redis.get(guestCartKey(sessionToken));
    return raw ? JSON.parse(raw) : { items: [], updatedAt: new Date().toISOString() };
  },

  async save(sessionToken: string, cart: GuestCart): Promise<void> {
    cart.updatedAt = new Date().toISOString();
    await redis.setex(guestCartKey(sessionToken), GUEST_CART_TTL, JSON.stringify(cart));
  },

  async clear(sessionToken: string): Promise<void> {
    await redis.del(guestCartKey(sessionToken));
  },
};

// ── Cart service ───────────────────────────────────────────────

export const cartService = {
  // ── Add / update item ─────────────────────────────────────────

  async addItem(
    { customerId, sessionToken }: { customerId?: string; sessionToken?: string },
    variantId: string,
    quantity: number,
  ) {
    // Validate variant + get current price (LKR)
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: { select: { status: true, title: true } },
      },
    });

    if (!variant) throw new AppError(ErrorCodes.NOT_FOUND, 'Product variant not found', 404);
    if (variant.product.status !== 'ACTIVE') throw new AppError(ErrorCodes.VALIDATION_ERROR, 'This product is no longer available', 422);

    const availableQty =
      (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
    if (availableQty < quantity) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        availableQty === 0
          ? 'This item is out of stock'
          : `Only ${availableQty} units available`,
        422,
      );
    }

    const unitPrice = Number(variant.price);

    if (customerId) {
      // Auth user — persist to DB
      return this.addItemToDbCart(customerId, variantId, quantity, unitPrice);
    } else if (sessionToken) {
      // Guest — persist to Redis
      return this.addItemToGuestCart(sessionToken, variantId, quantity, unitPrice);
    }

    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Session token required for guest cart', 422);
  },

  async addItemToDbCart(customerId: string, variantId: string, quantity: number, unitPrice: number) {
    let cart = await prisma.cart.findFirst({
      where: { customerId },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customerId,
          currency: 'LKR',
          expiresAt: new Date(Date.now() + 30 * 24 * 3600_000), // 30 days
        },
        include: { items: true },
      });
    }

    const existing = cart.items.find((i) => i.variantId === variantId);

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity, unitPrice },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId, quantity, unitPrice },
      });
    }

    return this.getDbCart(customerId);
  },

  async addItemToGuestCart(sessionToken: string, variantId: string, quantity: number, unitPrice: number) {
    const cart = await guestCartService.get(sessionToken);
    const existing = cart.items.find((i) => i.variantId === variantId);

    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice = unitPrice; // Refresh price on add
    } else {
      cart.items.push({ variantId, quantity, unitPrice });
    }

    await guestCartService.save(sessionToken, cart);
    return this.enrichGuestCart(cart);
  },

  // ── Update quantity ───────────────────────────────────────────

  async updateQuantity(
    { customerId, sessionToken }: { customerId?: string; sessionToken?: string },
    variantId: string,
    quantity: number,
  ) {
    if (quantity <= 0) return this.removeItem({ customerId, sessionToken }, variantId);

    if (customerId) {
      const item = await prisma.cartItem.findFirst({
        where: { cart: { customerId }, variantId },
      });
      if (!item) throw new AppError(ErrorCodes.NOT_FOUND, 'Item not in cart', 404);
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
      return this.getDbCart(customerId);
    }

    if (sessionToken) {
      const cart = await guestCartService.get(sessionToken);
      const item = cart.items.find((i) => i.variantId === variantId);
      if (!item) throw new AppError(ErrorCodes.NOT_FOUND, 'Item not in cart', 404);
      item.quantity = quantity;
      await guestCartService.save(sessionToken, cart);
      return this.enrichGuestCart(cart);
    }
  },

  // ── Remove item ───────────────────────────────────────────────

  async removeItem(
    { customerId, sessionToken }: { customerId?: string; sessionToken?: string },
    variantId: string,
  ) {
    if (customerId) {
      await prisma.cartItem.deleteMany({
        where: { cart: { customerId }, variantId },
      });
      return this.getDbCart(customerId);
    }

    if (sessionToken) {
      const cart = await guestCartService.get(sessionToken);
      cart.items = cart.items.filter((i) => i.variantId !== variantId);
      await guestCartService.save(sessionToken, cart);
      return this.enrichGuestCart(cart);
    }
  },

  // ── Clear cart ────────────────────────────────────────────────

  async clearCart({ customerId, sessionToken }: { customerId?: string; sessionToken?: string }) {
    if (customerId) {
      const cart = await prisma.cart.findFirst({ where: { customerId } });
      if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { items: [], total: { amount: 0, currency: 'LKR' }, itemCount: 0 };
    }
    if (sessionToken) {
      await guestCartService.clear(sessionToken);
      return { items: [], total: { amount: 0, currency: 'LKR' }, itemCount: 0 };
    }
  },

  // ── Get cart ──────────────────────────────────────────────────

  async getCart({ customerId, sessionToken }: { customerId?: string; sessionToken?: string }) {
    if (customerId) return this.getDbCart(customerId);
    if (sessionToken) {
      const cart = await guestCartService.get(sessionToken);
      return this.enrichGuestCart(cart);
    }
    return { items: [], total: { amount: 0, currency: 'LKR' }, itemCount: 0 };
  },

  async getDbCart(customerId: string) {
    const cart = await prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                    vendor: {
                      include: { storefront: { select: { slug: true, displayName: true } } },
                    },
                  },
                },
                inventory: { select: { quantity: true, reservedQuantity: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) return { items: [], total: { amount: 0, currency: 'LKR' }, itemCount: 0 };
    return this.formatCart(cart.items);
  },

  async enrichGuestCart(guestCart: GuestCart) {
    if (guestCart.items.length === 0) {
      return { items: [], total: { amount: 0, currency: 'LKR' }, itemCount: 0 };
    }

    const variantIds = guestCart.items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            vendor: {
              include: { storefront: { select: { slug: true, displayName: true } } },
            },
          },
        },
        inventory: { select: { quantity: true, reservedQuantity: true } },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const enrichedItems = guestCart.items
      .filter((item) => variantMap.has(item.variantId))
      .map((item) => {
        const variant = variantMap.get(item.variantId)!;
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currentPrice: Number(variant.price),
          priceMismatch: item.unitPrice !== Number(variant.price),
          variant: {
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
          },
          product: {
            id: variant.product.id,
            title: variant.product.title,
            primaryImageUrl: variant.product.images[0]?.url ?? null,
            vendor: variant.product.vendor.storefront?.displayName ?? variant.product.vendor.businessName,
            vendorSlug: variant.product.vendor.storefront?.slug ?? '',
          },
          availability: {
            inStock: (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0) > 0,
            availableQty: Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0)),
          },
        };
      });

    const subtotal = enrichedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    return {
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, i) => sum + i.quantity, 0),
      total: { amount: subtotal, currency: 'LKR' },
    };
  },

  formatCart(
    items: Awaited<ReturnType<typeof prisma.cart.findFirst> & { items: unknown[] }>['items'] extends (infer I)[] ? I[] : never,
  ) {
    // Implementation mirrors enrichGuestCart for DB items
    const enriched = (items as Parameters<typeof this.enrichGuestCart>[0]['items'] & { variant: { price: Prisma.Decimal; sku: string; size: string | null; color: string | null; product: { id: string; title: string; images: { url: string }[]; vendor: { businessName: string; storefront: { slug: string; displayName: string } | null } }; inventory: { quantity: number; reservedQuantity: number } | null } }[]).map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      currentPrice: Number(item.variant.price),
      priceMismatch: Number(item.unitPrice) !== Number(item.variant.price),
      variant: { id: item.variantId, sku: item.variant.sku, size: item.variant.size, color: item.variant.color },
      product: {
        id: item.variant.product.id,
        title: item.variant.product.title,
        primaryImageUrl: item.variant.product.images[0]?.url ?? null,
        vendor: item.variant.product.vendor.storefront?.displayName ?? item.variant.product.vendor.businessName,
        vendorSlug: item.variant.product.vendor.storefront?.slug ?? '',
      },
      availability: {
        inStock: (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reservedQuantity ?? 0) > 0,
        availableQty: Math.max(0, (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reservedQuantity ?? 0)),
      },
    }));

    const subtotal = enriched.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { items: enriched, itemCount: enriched.reduce((sum, i) => sum + i.quantity, 0), total: { amount: subtotal, currency: 'LKR' } };
  },

  // ── Merge guest → auth cart on login ──────────────────────────

  async mergeGuestCartOnLogin(sessionToken: string, customerId: string) {
    const guestCart = await guestCartService.get(sessionToken);
    if (guestCart.items.length === 0) return;

    for (const item of guestCart.items) {
      try {
        await this.addItem({ customerId }, item.variantId, item.quantity);
      } catch (err) {
        logger.warn({ variantId: item.variantId, err }, 'Could not merge guest cart item');
      }
    }

    await guestCartService.clear(sessionToken);
    logger.info({ customerId, mergedItems: guestCart.items.length }, 'Guest cart merged on login');
  },
};
