import { z } from 'zod';

// ── Address ────────────────────────────────────────────────────

export const createAddressSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+94\d{9}$/, 'Phone must be in +94XXXXXXXXX format (Sri Lanka)'),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  district: z.enum([
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'NuwaraEliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle',
  ]),
  province: z.enum([
    'Western', 'Central', 'Southern', 'Northern', 'Eastern',
    'North_Western', 'North_Central', 'Uva', 'Sabaragamuwa',
  ]),
  postalCode: z.string().regex(/^\d{5}$/, 'Sri Lankan postal codes are 5 digits').optional(),
  isDefault: z.boolean().default(false),
  deliveryInstructions: z.string().max(200).optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

// ── Checkout ───────────────────────────────────────────────────

export const checkoutSchema = z.object({
  shippingAddressId: z.string().cuid().optional(), // auth users
  shippingAddress: createAddressSchema.optional(),  // guest or new address
  billingAddressSameAsShipping: z.boolean().default(true),
  billingAddressId: z.string().cuid().optional(),
  shippingMethodByVendor: z
    .array(z.object({
      vendorId: z.string().cuid(),
      carrierId: z.string(),
    }))
    .optional(),
  couponCode: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
}).refine(
  (data) => data.shippingAddressId || data.shippingAddress,
  { message: 'Either shippingAddressId or shippingAddress must be provided' },
);

// ── Payment initiation ─────────────────────────────────────────

export const initiatePaymentSchema = z.object({
  orderId: z.string().cuid(),
  method: z.enum(['PAYHERE', 'GENIE', 'FRIMI', 'STRIPE', 'COD']),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ── PayHere webhook ────────────────────────────────────────────

export const payHereWebhookSchema = z.object({
  merchant_id: z.string(),
  order_id: z.string(),
  payment_id: z.string(),
  payhere_amount: z.string(),
  payhere_currency: z.string(),
  status_code: z.string(),
  md5sig: z.string(),
  status_message: z.string().optional(),
  method: z.string().optional(),
  card_holder_name: z.string().optional(),
  card_no: z.string().optional(),
  card_expiry: z.string().optional(),
  recurring: z.string().optional(),
  message_type: z.string().optional(),
  customer_token: z.string().optional(),
});

// ── Order management ───────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED',
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED',
  ]),
  trackingNumber: z.string().max(100).optional(),
  carrierId: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.enum([
    'CUSTOMER_REQUEST', 'OUT_OF_STOCK', 'PAYMENT_FAILED',
    'FRAUD_SUSPICION', 'DUPLICATE_ORDER', 'OTHER',
  ]),
  note: z.string().max(500).optional(),
});

// Types
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type PayHereWebhookInput = z.infer<typeof payHereWebhookSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
