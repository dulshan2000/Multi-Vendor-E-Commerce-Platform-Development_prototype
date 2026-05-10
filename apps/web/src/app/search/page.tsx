import { searchProducts } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    color?: string;
    size?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q;
  return {
    title: q ? `"${q}" — Search Results | MarkComm` : 'Search Products | MarkComm',
    description: q
      ? `Find the best ${q} from verified Sri Lankan vendors on MarkComm. Shop securely with PayHere.`
      : 'Search thousands of products from verified Sri Lankan vendors.',
  };
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'rating', label: 'Top Rated' },
] as const;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const sort = (params.sort ?? 'relevance') as Parameters<typeof searchProducts>[0]['sort'];
  const page = parseInt(params.page ?? '1', 10);
  const limit = 24;

  const searchResponse = await searchProducts({
    q: q || undefined,
    categoryId: params.categoryId,
    color: params.color,
    size: params.size,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    sort,
    inStock: params.inStock === 'true' ? true : undefined,
    page,
    limit,
  }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit } }));

  const products = searchResponse.data;
  const meta = searchResponse.meta;
  const total = typeof meta.total === 'object' ? meta.total.value : meta.total;
  const totalPages = Math.ceil(total / limit);

  // Active filters
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (params.color) activeFilters.push({ key: 'color', label: 'Color', value: params.color });
  if (params.size) activeFilters.push({ key: 'size', label: 'Size', value: params.size });
  if (params.minPrice) activeFilters.push({ key: 'minPrice', label: 'Min Price', value: `Rs. ${Number(params.minPrice).toLocaleString()}` });
  if (params.maxPrice) activeFilters.push({ key: 'maxPrice', label: 'Max Price', value: `Rs. ${Number(params.maxPrice).toLocaleString()}` });
  if (params.inStock === 'true') activeFilters.push({ key: 'inStock', label: 'In Stock Only', value: 'Yes' });

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = { ...params, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
    return `/search?${qs}`;
  };

  // Aggregations for filter sidebar
  const agg = (meta as Record<string, unknown>).aggregations as {
    colors?: { buckets: { key: string; doc_count: number }[] };
    sizes?: { buckets: { key: string; doc_count: number }[] };
    priceRange?: { min: number; max: number };
  } | undefined;

  return (
    <div className="container-xl py-6 md:py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {q ? (
            <>Search results for <span className="text-primary">&ldquo;{q}&rdquo;</span></>
          ) : 'All Products'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total.toLocaleString()} {total === 1 ? 'product' : 'products'} found
        </p>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <Link
              key={f.key}
              href={buildUrl({ [f.key]: undefined, page: '1' })}
              className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 hover:bg-primary/20 transition-colors"
            >
              {f.label}: {f.value}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          ))}
          <Link
            href={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
            className="text-xs text-muted-foreground hover:text-foreground underline px-2 py-1"
          >
            Clear all
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="hidden md:flex flex-col gap-6 w-56 flex-shrink-0">
          {/* In Stock filter */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Availability</h3>
            <Link
              href={buildUrl({ inStock: params.inStock === 'true' ? undefined : 'true', page: '1' })}
              className={`flex items-center gap-2 text-sm py-1 hover:text-primary transition-colors ${params.inStock === 'true' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              <span className={`w-4 h-4 border rounded flex items-center justify-center ${params.inStock === 'true' ? 'bg-primary border-primary' : 'border-border'}`}>
                {params.inStock === 'true' && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 12l5 5L20 7"/></svg>}
              </span>
              In Stock Only
            </Link>
          </div>

          {/* Colors */}
          {agg?.colors?.buckets && agg.colors.buckets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Color</h3>
              <div className="flex flex-wrap gap-1.5">
                {agg.colors.buckets.slice(0, 12).map((b) => (
                  <Link
                    key={b.key}
                    href={buildUrl({ color: params.color === b.key ? undefined : b.key, page: '1' })}
                    title={`${b.key} (${b.doc_count})`}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${params.color === b.key ? 'border-primary scale-110' : 'border-border'}`}
                    style={{ backgroundColor: b.key.startsWith('#') ? b.key : b.key.toLowerCase() }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {agg?.sizes?.buckets && agg.sizes.buckets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Size</h3>
              <div className="flex flex-wrap gap-1.5">
                {agg.sizes.buckets.slice(0, 12).map((b) => (
                  <Link
                    key={b.key}
                    href={buildUrl({ size: params.size === b.key ? undefined : b.key, page: '1' })}
                    className={`px-2.5 py-1 text-xs border rounded-lg hover:border-primary transition-colors ${params.size === b.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {b.key}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Price range */}
          {agg?.priceRange && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Price (LKR)</h3>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { label: 'Under Rs. 1,000', min: undefined, max: '1000' },
                  { label: 'Rs. 1,000 – 5,000', min: '1000', max: '5000' },
                  { label: 'Rs. 5,000 – 15,000', min: '5000', max: '15000' },
                  { label: 'Over Rs. 15,000', min: '15000', max: undefined },
                ].map(({ label, min, max }) => (
                  <Link
                    key={label}
                    href={buildUrl({ minPrice: min, maxPrice: max, page: '1' })}
                    className={`text-sm hover:text-primary transition-colors ${params.minPrice === min && params.maxPrice === max ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{total.toLocaleString()} results</p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-muted-foreground">Sort by:</label>
              <select
                id="sort-select"
                defaultValue={sort}
                onChange={(e) => {
                  window.location.href = buildUrl({ sort: e.target.value, page: '1' });
                }}
                className="text-sm bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No products found</h2>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search term
              </p>
              <Link href="/search" className="text-primary hover:underline font-medium">
                Clear all filters
              </Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
