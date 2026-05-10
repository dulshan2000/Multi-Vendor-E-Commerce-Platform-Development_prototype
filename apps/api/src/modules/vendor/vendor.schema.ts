import { z } from 'zod';

// ── Sri Lanka phone validation ─────────────────────────────────
const sriLankaPhone = z
  .string()
  .regex(/^\+94[0-9]{9}$/, 'Phone must be in format +94XXXXXXXXX (Sri Lanka)');

// ── Step schemas (each onboarding step validates independently) ─

export const step1BusinessSchema = z.object({
  businessName: z.string().min(2).max(200),
  businessType: z.enum(['SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'PVT_LTD', 'PLC', 'NGO']),
  businessRegNo: z.string().min(1).max(50).optional(),
  taxNumber: z.string().min(1).max(50).optional(), // TIN (Tax Identification Number)
  phone: sriLankaPhone,
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  province: z.enum([
    'WESTERN', 'CENTRAL', 'SOUTHERN', 'NORTHERN', 'EASTERN',
    'NORTH_WESTERN', 'NORTH_CENTRAL', 'UVA', 'SABARAGAMUWA',
  ]),
  postalCode: z.string().regex(/^[0-9]{5}$/, 'Postal code must be 5 digits'),
  website: z.string().url().optional(),
});

export const step2DocumentSchema = z.object({
  // Document keys come from presigned S3 upload — client uploads then notifies us
  documentKeys: z.array(
    z.object({
      type: z.enum(['BUSINESS_REGISTRATION', 'NATIONAL_ID', 'TAX_CERTIFICATE', 'BANK_STATEMENT']),
      s3Key: z.string().min(1),
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
    }),
  ).min(1, 'At least one document is required'),
});

export const step3PayoutSchema = z.object({
  accountType: z.enum(['BANK', 'PAYPAL']),
  accountName: z.string().min(1).max(200),
  bankName: z.enum([
    'BANK_OF_CEYLON',
    'PEOPLES_BANK',
    'COMMERCIAL_BANK',
    'SAMPATH_BANK',
    'HNB',          // Hatton National Bank
    'NSB',          // National Savings Bank
    'DFCC',
    'NTB',          // Nations Trust Bank
    'UNION_BANK',
    'SEYLAN_BANK',
    'OTHER',
  ]).optional(),
  branchCode: z.string().optional(),
  accountNumber: z.string().min(1).max(30),
  // PayPal
  paypalEmail: z.string().email().optional(),
});

export const step4StoreSetupSchema = z.object({
  slug: z
    .string()
    .min(3, 'Store URL must be at least 3 characters')
    .max(60, 'Store URL must be at most 60 characters')
    .regex(/^[a-z0-9-]+$/, 'Store URL can only contain lowercase letters, numbers, and hyphens'),
  displayName: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  tagline: z.string().max(150).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoS3Key: z.string().optional(),
  bannerS3Key: z.string().optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional(),
    facebook: z.string().url().optional(),
    website: z.string().url().optional(),
  }).optional(),
  categories: z.array(z.string()).min(1, 'Select at least one product category').max(5),
});

// ── Admin actions ──────────────────────────────────────────────

export const approveVendorSchema = z.object({
  note: z.string().max(500).optional(),
});

export const rejectVendorSchema = z.object({
  reason: z.string().min(10, 'Please provide a rejection reason').max(500),
});

export const suspendVendorSchema = z.object({
  reason: z.string().min(10, 'Please provide a suspension reason').max(500),
  durationDays: z.number().int().min(1).optional(), // undefined = indefinite
});

// ── Staff management ───────────────────────────────────────────

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  permissions: z.object({
    manageOrders: z.boolean().default(true),
    manageCatalog: z.boolean().default(false),
    viewAnalytics: z.boolean().default(true),
    manageStaff: z.boolean().default(false),
  }),
});

// ── Commission rules ───────────────────────────────────────────

export const createCommissionRuleSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED', 'TIERED']),
  rate: z.number().min(0).max(1).optional(),      // 0.10 = 10%
  fixedAmount: z.number().min(0).optional(),       // LKR amount
  thresholdMin: z.number().min(0).optional(),
  thresholdMax: z.number().min(0).optional(),
  effectiveFrom: z.string().datetime().optional(),
});

// ── Upload URL request ─────────────────────────────────────────

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum([
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  purpose: z.enum(['DOCUMENT', 'LOGO', 'BANNER', 'PRODUCT_IMAGE']),
});

// Types
export type Step1BusinessInput = z.infer<typeof step1BusinessSchema>;
export type Step2DocumentInput = z.infer<typeof step2DocumentSchema>;
export type Step3PayoutInput = z.infer<typeof step3PayoutSchema>;
export type Step4StoreSetupInput = z.infer<typeof step4StoreSetupSchema>;
export type ApproveVendorInput = z.infer<typeof approveVendorSchema>;
export type RejectVendorInput = z.infer<typeof rejectVendorSchema>;
export type SuspendVendorInput = z.infer<typeof suspendVendorSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
