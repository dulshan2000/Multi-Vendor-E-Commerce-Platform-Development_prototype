import { PrismaClient, type Prisma, type OrderStatus, type PaymentStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { cartService } from '../cart/cart.service.js';
import { calculateLKTax, generateOrderNumber } from '../../lib/utils.js';
import {
  buildPayHereFormData,
  verifyPayHereWebhook,
  interpretPayHereStatus,
} from '../../lib/payhere.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { emailService } from '../../lib/email.js';
import type { CheckoutInput, CreateAddressInput, UpdateOrderStatusInput, CancelOrderInput } from './order.schema.js';

const prisma = new PrismaClient();

// ── Shipping rates (LKR) ───────────────────────────────────────
// Flat rates per carrier — in production these would be fetched from carrier APIs

const SHIPPING_RATES: Record<string, number> = {
  DOMEX: 350,
  PICKME_DELIVERY: 280,
  LANKA_POST_EMS: 200,
  KAPRUKA: 320,
  STORE_PICKUP: 0,
};

const FREE_SHIPPING_THRESHOLD = 2500; // LKR

// ── Address Service ────────────────────────────────────────────

export const addressService = {
  async create(customerId: string, data: CreateAddressInput) {
    if (data.isDefault) {
      // Unset existing default
      await prisma.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return prisma.address.create({ data: { ...data, customerId } });
  },

  async list(customerId: string) {
    return prisma.address.findMany({
      where: { customerId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async update(id: string, customerId: string, data: Partial<CreateAddressInput>) {
    await this.assertOwnership(id, customerId);
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return prisma.address.update({ where: { id }, data });
  },

  async delete(id: string, customerId: string) {
    await this.assertOwnership(id, customerId);
    await prisma.address.update({ where: { id }, data: { isActive: false } });
    return { message: 'Address deleted' };
  },

  async assertOwnership(id: string, customerId: string) {
    const addr = await prisma.address.findUnique({ where: { id } });
    if (!addr) throw new AppError(ErrorCodes.NOT_FOUND, 'Address not found', 404);
    if (addr.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    return addr;
  },
};

// ── Checkout Service ───────────────────────────────────────────

export const checkoutService = {
  async calculateTotals(customerId?: string, sessionToken?: string) {
    const cart = await cartService.getCart({ customerId, sessionToken });
    if (!cart || cart.items.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cart is empty', 422);
    }

    // Check all items are in stock
    const outOfStock = cart.items.filter((i) => !i.availability.inStock);
    if (outOfStock.length > 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR,
        `${outOfStock.length} item(s) are out of stock: ${outOfStock.map((i) => i.product.title).join(', ')}`,
        422,
      );
    }

    const subtotal = cart.total.amount;
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 350;
    const tax = calculateLKTax(subtotal);

    return {
      items: cart.items,
      itemCount: cart.itemCount,
      subtotal,
      shippingFee,
      tax,
      total: subtotal + shippingFee, // VAT already in prices (inclusive)
      currency: 'LKR' as const,
    };
  },

  async placeOrder(
    data: CheckoutInput,
    customerId?: string,
    sessionToken?: string,
  ) {
    const totals = await this.calculateTotals(customerId, sessionToken);

    // Resolve shipping address
    let shippingAddress: Prisma.JsonObject;
    if (data.shippingAddressId && customerId) {
      const addr = await prisma.address.findUnique({ where: { id: data.shippingAddressId } });
      if (!addr || addr.customerId !== customerId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Shipping address not found', 404);
      }
      shippingAddress = addr as unknown as Prisma.JsonObject;
    } else if (data.shippingAddress) {
      shippingAddress = data.shippingAddress as unknown as Prisma.JsonObject;
    } else {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Shipping address required', 422);
    }

    // Group items by vendor for multi-vendor order splitting
    const byVendor = new Map<string, typeof totals.items>();
    for (const item of totals.items) {
      if (!byVendor.has(item.product.vendorSlug)) {
        byVendor.set(item.product.vendorSlug, []);
      }
      byVendor.get(item.product.vendorSlug)!.push(item);
    }

    // Get vendor IDs from slugs
    const vendorSlugs = [...byVendor.keys()];
    const vendors = await prisma.vendorStorefront.findMany({
      where: { slug: { in: vendorSlugs } },
      select: { slug: true, vendorId: true },
    });
    const vendorSlugToId = new Map(vendors.map((v) => [v.slug, v.vendorId]));

    const order = await prisma.$transaction(async (tx) => {
      // Create parent order
      const o = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: customerId ?? null,
          sessionToken: sessionToken ?? null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          tax: totals.tax.taxTotal,
          total: totals.total,
          currency: 'LKR',
          shippingAddress,
          billingAddress: data.billingAddressSameAsShipping ? shippingAddress : shippingAddress, // billing same for now
          note: data.note,
          couponCode: data.couponCode,
        },
      });

      // Create sub-orders per vendor + order items
      for (const [vendorSlug, items] of byVendor.entries()) {
        const vendorId = vendorSlugToId.get(vendorSlug);
        if (!vendorId) continue;

        const vendorSubtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const vendorShipping = items.length > 0 ? Math.round(totals.shippingFee / byVendor.size) : 0;

        const subOrder = await tx.vendorOrder.create({
          data: {
            orderId: o.id,
            vendorId,
            status: 'PENDING',
            subtotal: vendorSubtotal,
            shippingFee: vendorShipping,
            total: vendorSubtotal + vendorShipping,
          },
        });

        await tx.orderItem.createMany({
          data: items.map((item) => ({
            orderId: o.id,
            vendorOrderId: subOrder.id,
            variantId: item.variantId,
            productTitle: item.product.title,
            variantSku: item.variant.sku,
            variantSize: item.variant.size,
            variantColor: item.variant.color,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
            vendorId,
          })),
        });

        // Reserve inventory
        for (const item of items) {
          await tx.inventoryRecord.updateMany({
            where: { variantId: item.variantId },
            data: { reservedQuantity: { increment: item.quantity } },
          });
        }
      }

      return o;
    });

    // Clear cart after order
    await cartService.clearCart({ customerId, sessionToken });

    logger.info({ orderId: order.id, orderNumber: order.orderNumber, total: totals.total }, 'Order placed');

    return order;
  },
};

// ── Payment Service ────────────────────────────────────────────

export const paymentService = {
  async initiatePayHere(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (customerId && order.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    if (order.paymentStatus !== 'PENDING') {
      throw new AppError(ErrorCodes.CONFLICT, 'Order has already been paid', 409);
    }

    const addr = order.shippingAddress as Prisma.JsonObject;
    const firstName = String(order.customer?.firstName ?? (addr['recipientName'] as string)?.split(' ')[0] ?? 'Guest');
    const lastName = String(order.customer?.lastName ?? (addr['recipientName'] as string)?.split(' ').slice(1).join(' ') ?? 'Customer');

    const notifyUrl = `${env.API_URL}/api/v1/payments/payhere/webhook`;

    const formData = buildPayHereFormData({
      orderId: order.orderNumber, // Use human-readable order number
      orderDescription: `Order ${order.orderNumber} — MarkComm`,
      itemsDescription: `Order ${order.orderNumber}`,
      amountLKR: Number(order.total),
      customerFirstName: firstName,
      customerLastName: lastName,
      customerEmail: order.customer?.email ?? String(addr['email'] ?? ''),
      customerPhone: order.customer?.phone ?? String(addr['phone'] ?? ''),
      shippingAddress1: String(addr['addressLine1'] ?? ''),
      shippingCity: String(addr['city'] ?? ''),
      shippingDistrict: String(addr['district'] ?? 'Colombo'),
      returnUrl: `${env.APP_URL}/checkout/success?orderId=${order.id}`,
      cancelUrl: `${env.APP_URL}/checkout/cancelled?orderId=${order.id}`,
      notifyUrl,
    });

    // Track payment initiation
    await prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        method: 'PAYHERE',
        status: 'PENDING',
        amount: order.total,
        currency: 'LKR',
        metadata: { formData } as Prisma.JsonObject,
      },
    });

    logger.info({ orderId: order.id, method: 'PAYHERE' }, 'PayHere payment initiated');

    return {
      checkoutUrl: `https://sandbox.payhere.lk/pay/checkout`,
      formData,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  },

  async handlePayHereWebhook(params: {
    merchantId: string;
    orderId: string; // order number in PayHere
    paymentId: string;
    payHereAmount: string;
    payHereCurrency: string;
    statusCode: string;
    md5sig: string;
    statusMessage?: string;
    method?: string;
  }) {
    // Verify signature
    const isValid = verifyPayHereWebhook({
      merchantId: params.merchantId,
      orderId: params.orderId,
      payHereAmount: params.payHereAmount,
      payHereCurrency: params.payHereCurrency,
      statusCode: params.statusCode,
      md5sig: params.md5sig,
      merchantSecret: env.PAYHERE_MERCHANT_SECRET,
    });

    if (!isValid) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Invalid PayHere webhook signature', 403);
    }

    const payHereStatus = interpretPayHereStatus(params.statusCode);

    // Resolve order by order number
    const order = await prisma.order.findFirst({
      where: { orderNumber: params.orderId },
    });

    if (!order) {
      logger.warn({ payHereOrderId: params.orderId }, 'PayHere webhook: order not found');
      return { received: true };
    }

    const paymentStatusMap: Record<string, PaymentStatus> = {
      SUCCESS: 'PAID',
      PENDING: 'PENDING',
      CANCELLED: 'CANCELLED',
      FAILED: 'FAILED',
      CHARGEDBACK: 'DISPUTED',
    };
    const newPaymentStatus = paymentStatusMap[payHereStatus] ?? 'FAILED';
    const newOrderStatus: OrderStatus = payHereStatus === 'SUCCESS' ? 'CONFIRMED' : order.status;

    await prisma.$transaction(async (tx) => {
      // Update order payment status
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: newPaymentStatus, status: newOrderStatus },
      });

      // Update payment record
      await tx.paymentRecord.updateMany({
        where: { orderId: order.id, method: 'PAYHERE' },
        data: {
          status: newPaymentStatus,
          gatewayPaymentId: params.paymentId,
          metadata: {
            payHereStatus,
            statusMessage: params.statusMessage,
            method: params.method,
          } as Prisma.JsonObject,
        },
      });

      // If payment failed — release inventory reservations
      if (payHereStatus !== 'SUCCESS') {
        const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of items) {
          await tx.inventoryRecord.updateMany({
            where: { variantId: item.variantId },
            data: { reservedQuantity: { decrement: item.quantity } },
          });
        }
      }
    });

    // Send confirmation email (non-blocking)
    if (payHereStatus === 'SUCCESS') {
      this.sendOrderConfirmation(order.id).catch((err) =>
        logger.error({ err, orderId: order.id }, 'Failed to send order confirmation email'),
      );
    }

    logger.info({ orderId: order.id, payHereStatus, newPaymentStatus }, 'PayHere webhook processed');
    return { received: true };
  },

  async initiateCOD(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (customerId && order.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PENDING', status: 'CONFIRMED' },
      }),
      prisma.paymentRecord.create({
        data: {
          orderId,
          method: 'COD',
          status: 'PENDING',
          amount: order.total,
          currency: 'LKR',
        },
      }),
    ]);

    this.sendOrderConfirmation(orderId).catch(() => {});
    return { message: 'Cash on Delivery order confirmed', orderId };
  },

  async sendOrderConfirmation(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      },
    });
    if (!order) return;

    const email = order.customer?.email;
    if (!email) return;

    await emailService.sendOrderConfirmation({
      to: email,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      currency: 'LKR',
      items: order.items.map((i) => ({
        title: i.productTitle,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });
  },
};

// ── Order Service ──────────────────────────────────────────────

export const orderService = {
  async getOrder(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
              },
            },
          },
        },
        vendorOrders: {
          include: {
            vendor: { select: { businessName: true, storefront: { select: { slug: true, displayName: true } } } },
            items: true,
          },
        },
      },
    });

    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (customerId && order.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    return order;
  },

  async listCustomerOrders(customerId: string, params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(status && { status: status as OrderStatus }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { take: 3 },
          _count: { select: { items: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  async listVendorOrders(vendorId: string, params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.VendorOrderWhereInput = {
      vendorId,
      ...(status && { status: status as OrderStatus }),
    };

    const [orders, total] = await Promise.all([
      prisma.vendorOrder.findMany({
        where,
        include: {
          order: { select: { orderNumber: true, createdAt: true, shippingAddress: true } },
          items: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendorOrder.count({ where }),
    ]);

    return { orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  async updateVendorOrderStatus(vendorOrderId: string, vendorId: string, data: UpdateOrderStatusInput) {
    const vendorOrder = await prisma.vendorOrder.findUnique({ where: { id: vendorOrderId } });
    if (!vendorOrder) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (vendorOrder.vendorId !== vendorId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        status: data.status as OrderStatus,
        trackingNumber: data.trackingNumber,
        carrierId: data.carrierId,
        ...(data.status === 'SHIPPED' && { shippedAt: new Date() }),
        ...(data.status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    });

    // If delivered — deduct from inventory (was reserved, now deduct)
    if (data.status === 'DELIVERED') {
      const items = await prisma.orderItem.findMany({ where: { vendorOrderId } });
      for (const item of items) {
        await prisma.inventoryRecord.updateMany({
          where: { variantId: item.variantId },
          data: {
            quantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }
    }

    logger.info({ vendorOrderId, status: data.status, trackingNumber: data.trackingNumber }, 'Vendor order status updated');
    return updated;
  },

  async cancelOrder(orderId: string, customerId: string, data: CancelOrderInput) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (order.customerId !== customerId) throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new AppError(ErrorCodes.CONFLICT, 'Order cannot be cancelled at this stage', 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: data.reason },
      });

      // Release reserved inventory
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.inventoryRecord.updateMany({
          where: { variantId: item.variantId },
          data: { reservedQuantity: { decrement: item.quantity } },
        });
      }
    });

    logger.info({ orderId, reason: data.reason }, 'Order cancelled');
    return { message: 'Order cancelled successfully' };
  },
};
