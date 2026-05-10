import { z } from 'zod';

// ── Coupon ──────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, underscores'),
  description: z.string().max(200).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().positive(), // % or LKR amount
  minOrderAmount: z.number().nonnegative().default(0), // minimum LKR order for coupon to apply
  maxDiscountAmount: z.number().positive().optional(), // cap for % discounts
  usageLimit: z.number().int().positive().optional(), // null = unlimited
  usageLimitPerUser: z.number().int().positive().default(1),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  applicableVendorId: z.string().cuid().optional(), // null = platform-wide
  applicableCategoryId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  orderAmount: z.number().positive(),
  vendorId: z.string().cuid().optional(),
});

// ── Return / Refund ─────────────────────────────────────────────

export const createReturnSchema = z.object({
  orderId: z.string().cuid(),
  items: z.array(z.object({
    orderItemId: z.string().cuid(),
    quantity: z.number().int().positive(),
    reason: z.enum([
      'WRONG_ITEM', 'DAMAGED', 'DEFECTIVE', 'NOT_AS_DESCRIBED',
      'CHANGED_MIND', 'SIZE_ISSUE', 'OTHER',
    ]),
  })).min(1),
  notes: z.string().max(500).optional(),
  preferredResolution: z.enum(['REFUND', 'REPLACEMENT', 'STORE_CREDIT']).default('REFUND'),
});

export const updateReturnSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'ITEMS_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'RESOLVED']),
  adminNote: z.string().max(500).optional(),
  refundAmount: z.number().positive().optional(),
  refundReference: z.string().max(100).optional(),
});

// ── Wishlist ────────────────────────────────────────────────────

export const addToWishlistSchema = z.object({
  productId: z.string().cuid(),
});

// Types
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;
