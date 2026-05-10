// ── Shared utility functions ──────────────────────────────────

/**
 * Converts a string to a URL-safe slug.
 * e.g. "Women's Summer Dress!" → "womens-summer-dress"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // Remove non-alphanumeric
    .replace(/\s+/g, '-')            // Spaces to hyphens
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-|-$/g, '');          // Trim leading/trailing hyphens
}

/**
 * Format LKR amount for display.
 * e.g. formatLKR(1500) → "Rs. 1,500.00"
 */
export function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate Sri Lanka tax amounts.
 * VAT: 18%, NBT (Nation Building Tax): 2%
 */
export function calculateLKTax(subtotalLKR: number): {
  subtotal: number;
  vatAmount: number;
  nbtAmount: number;
  taxTotal: number;
  grandTotal: number;
  vatRate: number;
  nbtRate: number;
} {
  const vatRate = Number(process.env['LK_VAT_RATE'] ?? 0.18);
  const nbtRate = Number(process.env['LK_NBT_RATE'] ?? 0.02);
  const vatAmount = Math.round(subtotalLKR * vatRate * 100) / 100;
  const nbtAmount = Math.round(subtotalLKR * nbtRate * 100) / 100;
  const taxTotal = vatAmount + nbtAmount;
  return {
    subtotal: subtotalLKR,
    vatAmount,
    nbtAmount,
    taxTotal,
    grandTotal: subtotalLKR + taxTotal,
    vatRate,
    nbtRate,
  };
}

/**
 * Generates a unique order number.
 * Format: MC-YYYYMMDD-XXXXX (e.g. MC-20260511-84921)
 */
export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `MC-${date}-${rand}`;
}

/**
 * Paginate an array (for in-memory operations).
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { data: T[]; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const data = items.slice((page - 1) * limit, page * limit);
  return {
    data,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Safely parse JSON, returns null on failure.
 */
export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Sleep for N milliseconds (useful in retry loops).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a cryptographically safe random token.
 */
export function generateToken(byteLength = 32): string {
  const { randomBytes } = require('crypto');
  return randomBytes(byteLength).toString('hex');
}
