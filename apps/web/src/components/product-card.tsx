import Link from 'next/link';
import Image from 'next/image';
import type { ProductSummary } from '@/lib/api';

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const stars = Math.round(rating * 2) / 2; // Round to nearest 0.5
  return (
    <div className="flex items-center gap-1">
      <div className="flex" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.floor(stars)
                ? 'text-amber-400 fill-amber-400'
                : star - 0.5 === stars
                ? 'text-amber-400 fill-amber-200'
                : 'text-gray-300 fill-gray-300'
            }`}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {count > 0 && (
        <span className="text-xs text-zinc-500">({count.toLocaleString()})</span>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const hasDiscount = false; // In a real app: compare with comparePrice from search
  const isNew = false; // Based on createdAt

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-violet-600/30"
      aria-label={`View ${product.title}`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-zinc-100 overflow-hidden">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
            <svg className="w-12 h-12 text-zinc-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!product.isInStock && (
            <span className="text-[10px] font-semibold bg-gray-900/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              Out of Stock
            </span>
          )}
          {isNew && (
            <span className="text-[10px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
              New
            </span>
          )}
          {hasDiscount && (
            <span className="text-[10px] font-semibold bg-rose-500 text-white px-2 py-0.5 rounded-full">
              Sale
            </span>
          )}
        </div>

        {/* Quick-view overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        {/* Vendor */}
        <span className="text-xs text-zinc-500 truncate">{product.vendorName}</span>

        {/* Title */}
        <h3 className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
          {product.title}
        </h3>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <StarRating rating={product.rating} count={product.reviewCount} />
        )}

        {/* Price (LKR) */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold text-zinc-900">{formatLKR(product.minPrice)}</span>
          {product.maxPrice > product.minPrice && (
            <span className="text-xs text-zinc-500">– {formatLKR(product.maxPrice)}</span>
          )}
        </div>

        {/* Colour swatches */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {product.colors.slice(0, 4).map((color) => (
              <span
                key={color}
                title={color}
                className="w-3.5 h-3.5 rounded-full border border-zinc-200"
                style={{ backgroundColor: color.startsWith('#') ? color : color.toLowerCase() }}
              />
            ))}
            {product.colors.length > 4 && (
              <span className="text-xs text-zinc-500">+{product.colors.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
