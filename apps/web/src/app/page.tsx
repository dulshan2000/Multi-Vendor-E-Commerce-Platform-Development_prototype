import { getFeaturedProducts, getNewArrivals, getCategories } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 300; // ISR — revalidate every 5 minutes

export default async function HomePage() {
  // Parallel data fetching
  const [featuredRes, newArrivalsRes, categoriesRes] = await Promise.allSettled([
    getFeaturedProducts(),
    getNewArrivals(),
    getCategories(),
  ]);

  const featured = featuredRes.status === 'fulfilled' ? featuredRes.value.data : [];
  const newArrivals = newArrivalsRes.status === 'fulfilled' ? newArrivalsRes.value.data : [];
  const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];

  return (
    <main>
      {/* ── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(var(--accent))] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="container-xl relative z-10 py-20 md:py-28 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              🇱🇰 Sri Lanka&apos;s Largest Multi-Vendor Platform
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4">
              Shop From
              <br />
              <span className="text-amber-300">Local Vendors</span>
              <br />
              You Trust
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Discover thousands of products from verified Sri Lankan sellers.
              Pay securely with PayHere, Dialog Genie, or FriMi.
              Delivered island-wide by Domex & PickMe.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="px-6 py-3 bg-white text-[hsl(var(--primary))] font-semibold rounded-xl hover:bg-white/90 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/vendor/register"
                className="px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/30 font-semibold rounded-xl hover:bg-white/25 transition-colors"
              >
                Sell With Us →
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: '🔒', text: 'Secure Payments' },
                { icon: '🚚', text: 'Island-Wide Delivery' },
                { icon: '↩️', text: 'Easy Returns' },
                { icon: '💬', text: '24/7 Support' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm text-white/80">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image placeholder */}
          <div className="flex-1 max-w-md relative">
            <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🛍️</div>
                <p className="text-white/70 text-sm">Hero image goes here</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Payment Gateways ────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="container-xl py-4 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Secure Payments:</span>
          {[
            { name: 'PayHere', color: '#FF6B35' },
            { name: 'Dialog Genie', color: '#00A3E0' },
            { name: 'FriMi', color: '#7B2D8B' },
            { name: 'Visa / MC', color: '#1A1F71' },
            { name: 'Cash on Delivery', color: '#10B981' },
          ].map(({ name, color }) => (
            <span key={name} className="flex items-center gap-1.5 font-medium" style={{ color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Category Grid ────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="container-xl py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Shop by Category</h2>
            <Link href="/categories" className="text-sm text-primary hover:underline font-medium">
              All categories →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-sm transition-all duration-200 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:bg-primary/20 transition-colors">
                  {cat.imageUrl ? (
                    <Image src={cat.imageUrl} alt={cat.name} width={32} height={32} className="object-contain" />
                  ) : '🛍️'}
                </div>
                <span className="text-xs font-medium text-foreground line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Products ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="container-xl py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Best Sellers</h2>
              <p className="text-muted-foreground text-sm mt-1">Most popular picks across all vendors</p>
            </div>
            <Link href="/search?sort=best_selling" className="text-sm text-primary hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        </section>
      )}

      {/* ── Promotional Banner ────────────────────────────────────── */}
      <section className="container-xl py-6">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide mb-1 text-amber-100">Limited Offer</p>
            <h2 className="text-2xl md:text-3xl font-bold">Get Free Shipping</h2>
            <p className="text-amber-100 mt-1">On orders above Rs. 2,500 — valid island-wide</p>
          </div>
          <Link
            href="/search?inStock=true"
            className="flex-shrink-0 px-6 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── New Arrivals ──────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="container-xl py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">New Arrivals</h2>
              <p className="text-muted-foreground text-sm mt-1">Fresh additions from our vendors</p>
            </div>
            <Link href="/search?sort=newest" className="text-sm text-primary hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Vendor CTA ────────────────────────────────────────────── */}
      <section className="bg-muted/50 border-t border-border">
        <div className="container-xl py-16 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-3">Grow Your Business With Us</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Join hundreds of Sri Lankan vendors already selling on MarkComm. 
            Set up your store in minutes — no upfront fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vendor/register"
              className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Start Selling
            </Link>
            <Link
              href="/vendor/learn-more"
              className="px-8 py-3 bg-card border border-border font-semibold rounded-xl hover:bg-muted transition-colors"
            >
              Learn More
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm text-muted-foreground">
            {[
              { stat: '500+', label: 'Active Vendors' },
              { stat: '10,000+', label: 'Products Listed' },
              { stat: '50,000+', label: 'Happy Customers' },
              { stat: '10%', label: 'Platform Commission' },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{stat}</div>
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
