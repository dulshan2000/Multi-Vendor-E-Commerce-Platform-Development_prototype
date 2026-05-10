import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// ── PayHere constants ──────────────────────────────────────────
// PayHere sandbox: https://sandbox.payhere.lk
// PayHere production: https://www.payhere.lk

const PAYHERE_BASE = env.PAYHERE_SANDBOX
  ? 'https://sandbox.payhere.lk'
  : 'https://www.payhere.lk';

export const PAYHERE_CHECKOUT_URL = `${PAYHERE_BASE}/pay/checkout`;

// ── Types ──────────────────────────────────────────────────────

export interface PayHereCheckoutParams {
  orderId: string;
  orderDescription: string;
  itemsDescription: string;
  amountLKR: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;    // +94XXXXXXXXX
  shippingAddress1: string;
  shippingCity: string;
  shippingDistrict: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PayHereFormData {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: 'LKR';
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: 'Sri Lanka';
  district: string;
  hash: string;
}

// ── Hash generation ────────────────────────────────────────────
// PayHere hash = MD5(merchant_id + order_id + amount + currency + MD5(secret).toUpperCase())

export function generatePayHereHash(
  merchantId: string,
  orderId: string,
  amountStr: string,
  currency: string,
  merchantSecret: string,
): string {
  const secretMd5 = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const raw = `${merchantId}${orderId}${amountStr}${currency}${secretMd5}`;
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

// ── Verify webhook signature ───────────────────────────────────

export function verifyPayHereWebhook(params: {
  merchantId: string;
  orderId: string;
  payHereAmount: string;
  payHereCurrency: string;
  statusCode: string;
  md5sig: string;
  merchantSecret: string;
}): boolean {
  const localHash = generatePayHereHash(
    params.merchantId,
    params.orderId,
    params.payHereAmount,
    params.payHereCurrency,
    params.merchantSecret,
  );

  const expectedSig = crypto
    .createHash('md5')
    .update(`${params.merchantId}${params.orderId}${params.payHereAmount}${params.payHereCurrency}${params.statusCode}${localHash}`)
    .digest('hex')
    .toUpperCase();

  const valid = expectedSig === params.md5sig.toUpperCase();

  if (!valid) {
    logger.warn({ orderId: params.orderId, received: params.md5sig, expected: expectedSig }, 'PayHere webhook signature mismatch');
  }

  return valid;
}

// ── Build checkout form data ───────────────────────────────────

export function buildPayHereFormData(params: PayHereCheckoutParams): PayHereFormData {
  const merchantId = env.PAYHERE_MERCHANT_ID;
  const merchantSecret = env.PAYHERE_MERCHANT_SECRET;
  const amountStr = params.amountLKR.toFixed(2);
  const currency = 'LKR';

  const hash = generatePayHereHash(merchantId, params.orderId, amountStr, currency, merchantSecret);

  return {
    merchant_id: merchantId,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    order_id: params.orderId,
    items: params.itemsDescription,
    currency,
    amount: amountStr,
    first_name: params.customerFirstName,
    last_name: params.customerLastName,
    email: params.customerEmail,
    phone: params.customerPhone,
    address: params.shippingAddress1,
    city: params.shippingCity,
    country: 'Sri Lanka',
    district: params.shippingDistrict,
    hash,
  };
}

// ── PayHere status codes ───────────────────────────────────────

export const PAYHERE_STATUS = {
  '2': 'SUCCESS',
  '0': 'PENDING',
  '-1': 'CANCELLED',
  '-2': 'FAILED',
  '-3': 'CHARGEDBACK',
} as const;

export type PayHereStatus = typeof PAYHERE_STATUS[keyof typeof PAYHERE_STATUS];

export function interpretPayHereStatus(statusCode: string): PayHereStatus {
  return (PAYHERE_STATUS as Record<string, string>)[statusCode] as PayHereStatus ?? 'FAILED';
}
