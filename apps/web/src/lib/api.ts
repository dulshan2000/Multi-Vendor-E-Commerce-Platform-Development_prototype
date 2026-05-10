// ── Centralised API client for the Next.js frontend ──────────────
// All fetches go through this module. ISR revalidation tags are
// passed as options so pages can granularly invalidate cache.

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  tags?: string[];
  revalidate?: number | false;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { tags, revalidate, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    next: {
      ...(tags && { tags }),
      ...(revalidate !== undefined && { revalidate }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error?.error?.message ?? `API error ${response.status}`);
  }

  return response.json();
}

// ── Categories ─────────────────────────────────────────────────

export async function getCategories() {
  return apiFetch<{ data: Category[] }>('/api/v1/categories', {
    tags: ['categories'],
    revalidate: 3600, // 1hr — categories change rarely
  });
}

// ── Products ───────────────────────────────────────────────────

export async function searchProducts(params: SearchParams) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiFetch<{ data: ProductSummary[]; meta: SearchMeta }>(`/api/v1/search/products?${qs}`, {
    tags: ['products', 'search'],
    revalidate: 30,
  });
}

export async function getProductById(id: string) {
  return apiFetch<{ data: ProductDetail }>(`/api/v1/products/${id}`, {
    tags: [`product:${id}`],
    revalidate: 30,
  });
}

export async function getFeaturedProducts() {
  return apiFetch<{ data: ProductSummary[]; meta: SearchMeta }>(
    '/api/v1/search/products?sort=best_selling&limit=8&inStock=true',
    {
      tags: ['products', 'featured'],
      revalidate: 300, // 5min
    },
  );
}

export async function getNewArrivals() {
  return apiFetch<{ data: ProductSummary[]; meta: SearchMeta }>(
    '/api/v1/search/products?sort=newest&limit=8&inStock=true',
    {
      tags: ['products', 'new-arrivals'],
      revalidate: 300,
    },
  );
}

// ── Search suggestions ─────────────────────────────────────────

export async function getSuggestions(q: string) {
  return apiFetch<{ data: SearchSuggestion[] }>(
    `/api/v1/search/suggest?q=${encodeURIComponent(q)}&limit=5`,
    { revalidate: 0 }, // Always fresh
  );
}

// ── Cart ───────────────────────────────────────────────────────
// Cart calls go client-side — not server-side fetch

// ── Types ──────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  children?: Category[];
}

export interface ProductSummary {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  title: string;
  status: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  salesCount: number;
  minPrice: number;
  maxPrice: number;
  currency: 'LKR';
  colors: string[];
  sizes: string[];
  isInStock: boolean;
  primaryImageUrl: string | null;
  _highlight?: { title?: string[] };
}

export interface ProductDetail {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  images: { id: string; url: string; isPrimary: boolean; altText: string | null; sortOrder: number }[];
  variants: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    material: string | null;
    price: number;
    comparePrice: number | null;
    isDefault: boolean;
    inventory: { quantity: number; reservedQuantity: number } | null;
  }[];
  categories: { category: Category }[];
  vendor: {
    id: string;
    businessName: string;
    storefront: { slug: string; displayName: string } | null;
  };
  reviews: Review[];
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface SearchMeta {
  total: number | { value: number };
  page: number;
  limit: number;
  aggregations?: {
    colors?: { buckets: { key: string; doc_count: number }[] };
    sizes?: { buckets: { key: string; doc_count: number }[] };
    priceRange?: { min: number; max: number; avg: number };
  };
}

export interface SearchSuggestion {
  id: string;
  title: string;
  primaryImageUrl: string | null;
  minPrice: number;
  currency: 'LKR';
}

export interface SearchParams {
  q?: string;
  categoryId?: string;
  vendorId?: string;
  vendorSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  rating?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'rating';
  page?: number;
  limit?: number;
}

export interface CartItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number;
  priceMismatch: boolean;
  variant: { id: string; sku: string; size: string | null; color: string | null };
  product: {
    id: string;
    title: string;
    primaryImageUrl: string | null;
    vendor: string;
    vendorSlug: string;
  };
  availability: { inStock: boolean; availableQty: number };
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  total: { amount: number; currency: 'LKR' };
}
