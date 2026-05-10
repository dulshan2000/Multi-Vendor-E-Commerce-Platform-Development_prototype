import { getProductById } from '@/lib/api';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AddToCartButton } from './add-to-cart-button';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 30; // ISR — revalidate every 30 seconds

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data: product } = await getProductById(id);
    return {
      title: `${product.title} | MarkComm`,
      description: product.description.slice(0, 160),
      openGraph: {
        title: product.title,
        description: product.description.slice(0, 160),
        images: product.images[0] ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return { title: 'Product Not Found | MarkComm' };
  }
}

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{rating.toFixed(1)} ({count.toLocaleString()} reviews)</span>
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let product;
  try {
    const res = await getProductById(id);
    product = res.data;
  } catch {
    notFound();
  }

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const inStock = product.variants.some(
    (v) => (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0) > 0,
  );

  const vendorName = product.vendor.storefront?.displayName ?? product.vendor.businessName;
  const vendorSlug = product.vendor.storefront?.slug;

  // Structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: defaultVariant?.sku,
    brand: { '@type': 'Organization', name: vendorName },
    offers: {
      '@type': 'Offer',
      price: defaultVariant ? Number(defaultVariant.price) : undefined,
      priceCurrency: 'LKR',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: vendorName },
    },
    aggregateRating: product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="container-xl py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          {product.categories[0] && (
            <>
              <Link href={`/categories/${product.categories[0].category.slug}`} className="hover:text-foreground transition-colors">
                {product.categories[0].category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {/* Images */}
          <div className="flex flex-col gap-3">
            {/* Primary image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
              {primaryImage ? (
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.altText ?? product.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl">🛍️</div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img) => (
                  <div key={img.id} className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${img.isPrimary ? 'border-primary' : 'border-border hover:border-primary/50'}`}>
                    <Image src={img.url} alt={img.altText ?? product.title} fill className="object-cover" sizes="64px" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-4">
            {/* Vendor */}
            {vendorSlug ? (
              <Link href={`/vendor/${vendorSlug}`} className="text-sm text-primary hover:underline font-medium">
                {vendorName}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">{vendorName}</span>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-snug">{product.title}</h1>

            {/* Rating */}
            {product.reviewCount > 0 && (
              <StarRating rating={product.rating} count={product.reviewCount} />
            )}

            {/* Price (LKR) */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">
                {defaultVariant ? formatLKR(Number(defaultVariant.price)) : 'Price on request'}
              </span>
              {defaultVariant?.comparePrice && Number(defaultVariant.comparePrice) > Number(defaultVariant.price) && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatLKR(Number(defaultVariant.comparePrice))}
                </span>
              )}
            </div>

            {/* Variants (client component for interactivity) */}
            <AddToCartButton
              productId={product.id}
              variants={product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                price: Number(v.price),
                comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
                isDefault: v.isDefault,
                availableQty: (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0),
              }))}
            />

            {/* Stock status */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {inStock ? 'In Stock — Ready to Ship' : 'Out of Stock'}
              </span>
            </div>

            {/* Delivery badges */}
            <div className="border border-border rounded-xl p-4 space-y-2">
              {[
                { icon: '🚚', text: 'Island-wide delivery via Domex, PickMe & Lanka Post' },
                { icon: '💳', text: 'Pay with PayHere, Dialog Genie, FriMi or Cash on Delivery' },
                { icon: '↩️', text: '7-day hassle-free returns' },
                { icon: '🔒', text: 'Secure checkout — buyer protection guaranteed' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="text-base">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="text-xs px-2.5 py-1 bg-muted rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Product Description</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {product.description}
          </div>
        </section>

        {/* Reviews */}
        {product.reviews.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    {review.isVerified && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Verified Purchase</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(review.createdAt).toLocaleDateString('en-LK')}</span>
                  </div>
                  {review.title && <h3 className="font-medium text-foreground text-sm mb-1">{review.title}</h3>}
                  {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
