import { getFeaturedProducts, getNewArrivals, getCategories } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 300;

const CATEGORY_ICONS: Record<string, string> = {
  'mens-fashion': '👔',
  'womens-fashion': '👗',
  'electronics': '📱',
  'home-garden': '🏡',
  'sports-outdoors': '⚽',
  'beauty-personal-care': '💄',
  'books-stationery': '📚',
  'food-groceries': '🥥',
};

export default async function HomePage() {
  const [featuredRes, newArrivalsRes, categoriesRes] = await Promise.allSettled([
    getFeaturedProducts(),
    getNewArrivals(),
    getCategories(),
  ]);

  const featured = featuredRes.status === 'fulfilled' ? featuredRes.value.data : [];
  const newArrivals = newArrivalsRes.status === 'fulfilled' ? newArrivalsRes.value.data : [];
  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-purple-800 text-white">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="container-xl relative z-10 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              🇱🇰 Sri Lanka&apos;s Largest Multi-Vendor Platform
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4">
              Shop From<br />
              <span className="text-amber-300">Local Vendors</span><br />
              You Trust
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Discover thousands of products from verified Sri Lankan sellers.
              Pay securely with PayHere, Dialog Genie, or Cash on Delivery.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/search" className="px-6 py-3 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-black/20">
                Shop Now
              </Link>
              <Link href="/vendor/register" className="px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/30 font-semibold rounded-xl hover:bg-white/25 transition-all">
                Sell With Us →
              </Link>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-white/75">
              {[['🔒', 'Secure Payments'], ['🚚', 'Island-Wide Delivery'], ['↩️', 'Easy Returns'], ['💬', '24/7 Support']].map(([icon, text]) => (
                <span key={text} className="flex items-center gap-1.5">{icon} {text}</span>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="flex-1 max-w-md w-full">
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
              <Image
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80"
                alt="Shopping in Sri Lanka"
                fill
                className="object-cover"
                priority
              />
              {/* Floating card */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">🛍️</div>
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Today&apos;s Top Pick</p>
                    <p className="text-sm font-bold text-zinc-900">Handloom Batik Shirt</p>
                    <p className="text-xs text-violet-600 font-semibold">Rs. 2,800 — Limited Stock</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Payment Trust Bar ─────────────────────────────────── */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="container-xl py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
          <span className="font-semibold text-zinc-700">Accepted payments:</span>
          {[
            { name: 'PayHere', color: '#FF6B35' },
            { name: 'Dialog Genie', color: '#00A3E0' },
            { name: 'FriMi', color: '#7B2D8B' },
            { name: 'Visa / MC', color: '#1A1F71' },
            { name: 'Cash on Delivery', color: '#10B981' },
          ].map(({ name, color }) => (
            <span key={name} className="flex items-center gap-1.5 font-medium" style={{ color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      <section className="container-xl py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Shop by Category</h2>
            <p className="text-zinc-500 text-sm mt-1">Find exactly what you&apos;re looking for</p>
          </div>
          <Link href="/search" className="text-sm text-violet-600 hover:text-violet-700 font-semibold">
            All categories →
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {(categories.length > 0 ? categories : [
            { id: '1', name: "Men's Fashion", slug: 'mens-fashion' },
            { id: '2', name: "Women's Fashion", slug: 'womens-fashion' },
            { id: '3', name: 'Electronics', slug: 'electronics' },
            { id: '4', name: 'Home & Garden', slug: 'home-garden' },
            { id: '5', name: 'Sports', slug: 'sports-outdoors' },
            { id: '6', name: 'Beauty', slug: 'beauty-personal-care' },
            { id: '7', name: 'Books', slug: 'books-stationery' },
            { id: '8', name: 'Food', slug: 'food-groceries' },
          ]).slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center gap-2 p-3 bg-white border border-zinc-200 rounded-2xl hover:border-violet-300 hover:shadow-md hover:shadow-violet-100 transition-all duration-200 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl group-hover:bg-violet-100 transition-colors">
                {CATEGORY_ICONS[cat.slug] ?? '🛍️'}
              </div>
              <span className="text-xs font-medium text-zinc-700 line-clamp-2 leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured / Best Sellers ───────────────────────────── */}
      <section className="container-xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Best Sellers</h2>
            <p className="text-zinc-500 text-sm mt-1">Most popular picks across all vendors</p>
          </div>
          <Link href="/search?sort=best_selling" className="text-sm text-violet-600 hover:text-violet-700 font-semibold">
            View all →
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyProductsPlaceholder label="Best sellers will appear here once products are added." />
        )}
      </section>

      {/* ── Promo Banner ─────────────────────────────────────── */}
      <section className="container-xl py-6">
        <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-wider mb-1 text-amber-100">Limited Offer</p>
            <h2 className="text-2xl md:text-3xl font-bold">Free Shipping on Rs. 2,500+</h2>
            <p className="text-amber-100 mt-1">Valid island-wide · Use code <code className="bg-white/20 px-2 py-0.5 rounded font-mono">FREESHIP</code></p>
          </div>
          <Link href="/search" className="relative z-10 flex-shrink-0 px-8 py-3 bg-white text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-colors shadow-lg">
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── New Arrivals ─────────────────────────────────────── */}
      <section className="container-xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">New Arrivals</h2>
            <p className="text-zinc-500 text-sm mt-1">Fresh additions from our vendors</p>
          </div>
          <Link href="/search?sort=newest" className="text-sm text-violet-600 hover:text-violet-700 font-semibold">
            View all →
          </Link>
        </div>
        {newArrivals.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyProductsPlaceholder label="New arrivals will appear here." />
        )}
      </section>

      {/* ── Vendor CTA ───────────────────────────────────────── */}
      <section className="container-xl py-12 mb-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 to-purple-50/40" />
          <div className="relative z-10">
            <div className="text-4xl mb-4">🏪</div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">Grow Your Business With Us</h2>
            <p className="text-zinc-500 max-w-lg mx-auto mb-8">
              Join hundreds of Sri Lankan vendors already selling on MarkComm. Set up your store in minutes — no upfront fees.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Link href="/vendor/register" className="px-8 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-all shadow-md">
                Start Selling Free
              </Link>
              <Link href="/search" className="px-8 py-3 bg-white border border-zinc-200 font-semibold rounded-xl hover:bg-zinc-50 transition-all text-zinc-700">
                Browse Marketplace
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { stat: '500+', label: 'Active Vendors' },
                { stat: '10,000+', label: 'Products Listed' },
                { stat: '50,000+', label: 'Happy Customers' },
                { stat: '10%', label: 'Platform Commission' },
              ].map(({ stat, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-violet-600">{stat}</div>
                  <div className="text-xs text-zinc-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyProductsPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-zinc-200 text-center">
      <div className="text-4xl mb-3">📦</div>
      <p className="text-zinc-400 text-sm max-w-xs">{label}</p>
    </div>
  );
}
