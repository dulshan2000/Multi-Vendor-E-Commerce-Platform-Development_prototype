/**
 * Shared types for the MarkComm multi-vendor platform.
 * Targeting the Sri Lankan market (LKR currency, PayHere payments).
 */

// ── API Response Envelope ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null;
  meta: PaginationMeta | Record<string, unknown> | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Currency & Locale ────────────────────────────────────────────

export type Currency = 'LKR' | 'USD' | 'EUR' | 'GBP';
export type Locale = 'en-LK' | 'si-LK' | 'ta-LK' | 'en-US';

export interface Money {
  amount: number;
  currency: Currency;
}

// ── Sri Lanka Address ────────────────────────────────────────────

export type SriLankaProvince =
  | 'WESTERN'
  | 'CENTRAL'
  | 'SOUTHERN'
  | 'NORTHERN'
  | 'EASTERN'
  | 'NORTH_WESTERN'
  | 'NORTH_CENTRAL'
  | 'UVA'
  | 'SABARAGAMUWA';

export interface SriLankaAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  province: SriLankaProvince;
  postalCode: string;
  countryCode: 'LK';
  phone: string; // Format: +94XXXXXXXXX
}

// ── Payment ──────────────────────────────────────────────────────

export type PaymentGateway = 'payhere' | 'stripe' | 'genie' | 'frimi' | 'cod';

export type PaymentMethod =
  | 'payhere_card'       // Visa/Mastercard via PayHere
  | 'payhere_ezcash'     // eZ Cash (Dialog mobile wallet)
  | 'payhere_mcash'      // mCash (Mobitel mobile wallet)
  | 'dialog_genie'       // Dialog Genie wallet
  | 'frimi'              // FriMi (Nations Trust Bank wallet)
  | 'stripe_card'        // International cards via Stripe
  | 'stripe_apple_pay'   // Apple Pay via Stripe
  | 'stripe_google_pay'  // Google Pay via Stripe
  | 'cod';               // Cash on Delivery

// PayHere specific types (https://support.payhere.lk/api-&-mobile-sdk)
export interface PayHereCheckoutData {
  merchantId: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  orderId: string;
  items: string;
  currency: 'LKR' | 'USD';
  amount: string; // formatted to 2 decimal places
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: 'Sri Lanka';
  hash: string; // MD5 hash for verification
  sandbox: boolean;
}

// ── Shipping ─────────────────────────────────────────────────────

export type ShippingCarrier =
  | 'DOMEX'          // Domex Express — Sri Lanka's largest local courier
  | 'PICKME_DELIVERY' // PickMe Delivery
  | 'LANKA_POST'     // Sri Lanka Post / EMS
  | 'KAPRUKA'        // Kapruka.com delivery network
  | 'DHL'            // DHL Express (international)
  | 'FEDEX'          // FedEx (international)
  | 'ARAMEX_LK'      // Aramex Sri Lanka
  | 'STORE_PICKUP';  // In-store pickup

export interface ShippingRate {
  carrier: ShippingCarrier;
  serviceName: string;
  price: Money;
  estimatedDays: number;
  isTracked: boolean;
}

// ── Tax (Sri Lanka) ──────────────────────────────────────────────

export interface TaxCalculation {
  vatRate: 0.18;        // 18% VAT (Sri Lanka)
  nbtRate: 0.02;        // 2% Nation Building Tax
  subtotal: Money;
  vatAmount: Money;
  nbtAmount: Money;
  total: Money;
}

// ── User & Auth ──────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'VENDOR_OWNER'
  | 'VENDOR_STAFF'
  | 'CUSTOMER'
  | 'GUEST';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface AuthTokens {
  accessToken: string;
  // refreshToken is in HttpOnly cookie
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// ── Vendor ───────────────────────────────────────────────────────

export type VendorStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export interface VendorProfile {
  id: string;
  businessName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  status: VendorStatus;
}

// ── Product ──────────────────────────────────────────────────────

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';

export interface ProductSummary {
  id: string;
  title: string;
  slug?: string;
  vendorId: string;
  vendorName: string;
  primaryImageUrl?: string;
  minPrice: Money;
  maxPrice: Money;
  rating: number;
  reviewCount: number;
  isInStock: boolean;
}

// ── Order ────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'VENDOR_ACCEPTED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'REFUNDED';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: Money;
  itemCount: number;
  createdAt: string;
}

// ── Loyalty ──────────────────────────────────────────────────────

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const LOYALTY_TIERS: Record<LoyaltyTier, { minPoints: number; benefits: string[] }> = {
  BRONZE: { minPoints: 0, benefits: ['Earn 1 point per LKR 100 spent'] },
  SILVER: { minPoints: 5000, benefits: ['Earn 1.5 points per LKR 100', 'Free standard shipping'] },
  GOLD: { minPoints: 15000, benefits: ['Earn 2 points per LKR 100', 'Free express shipping', 'Early access to sales'] },
  PLATINUM: { minPoints: 50000, benefits: ['Earn 3 points per LKR 100', 'Free express shipping', 'Priority support', 'Exclusive offers'] },
};

// ── Analytics ────────────────────────────────────────────────────

export interface VendorAnalyticsSummary {
  revenue: Money;
  ordersCount: number;
  averageOrderValue: Money;
  conversionRate: number;
  pendingPayoutAmount: Money;
  period: 'today' | '7d' | '30d' | 'custom';
}
