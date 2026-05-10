import { getFeaturedProducts, getNewArrivals, getCategories } from '@/lib/api';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { TrustBar } from '@/components/home/trust-bar';
import { SectionHeader } from '@/components/home/section-header';
import { PromoBanner } from '@/components/home/promo-banner';
import { VendorCTA } from '@/components/home/vendor-cta';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'MarkComm — Sri Lanka\'s Luxury Multi-Vendor Marketplace',
  description:
    'Discover curated fashion and lifestyle products from verified Sri Lankan vendors. Premium quality, islandwide delivery.',
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
    <div className="bg-surface-0">
      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <HeroSection />

      {/* ── 2. Trust Bar ────────────────────────────────────── */}
      <TrustBar />

      {/* ── 3. Categories ───────────────────────────────────── */}
      <section className="section-gap" aria-labelledby="categories-heading">
        <div className="container-editorial">
          <SectionHeader
            id="categories-heading"
            eyebrow="Discover"
            title="Shop by Category"
            linkHref="/search"
            linkLabel="Browse All"
          />
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* ── 4. Best Sellers ─────────────────────────────────── */}
      <section className="section-gap border-t border-default" aria-labelledby="bestsellers-heading">
        <div className="container-editorial">
          <SectionHeader
            id="bestsellers-heading"
            eyebrow="Bestsellers"
            title="Most Wanted"
            linkHref="/search?sort=best_selling"
            linkLabel="View All"
          />
          {featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {featured.slice(0, 8).map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Editorial Promo Banner ────────────────────────── */}
      <PromoBanner />

      {/* ── 6. New Arrivals ─────────────────────────────────── */}
      <section className="section-gap" aria-labelledby="new-arrivals-heading">
        <div className="container-editorial">
          <SectionHeader
            id="new-arrivals-heading"
            eyebrow="Fresh Drops"
            title="New Arrivals"
            linkHref="/search?sort=newest"
            linkLabel="View All"
          />
          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {newArrivals.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 7. Vendor CTA ───────────────────────────────────── */}
      <VendorCTA />
    </div>
  );
}
