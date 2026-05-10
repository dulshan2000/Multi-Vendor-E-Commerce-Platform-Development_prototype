'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { ProductSummary } from '@/lib/api';

/* ── Helpers ────────────────────────────────────────────────── */

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* ── Icons ─────────────────────────────────────────────────── */

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
      <svg
        className="w-10 h-10"
        style={{ color: 'var(--color-text-tertiary)' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

/* ── Animation variants ─────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const cardVariants: Variants = {
  rest: { y: 0, boxShadow: 'var(--shadow-card)', transition: { duration: 0.3, ease: EASE } },
  hover: { y: -6, boxShadow: 'var(--shadow-float)', transition: { duration: 0.35, ease: EASE } },
};

const imageVariants: Variants = {
  rest: { scale: 1, transition: { duration: 0.55, ease: EASE } },
  hover: { scale: 1.06, transition: { duration: 0.55, ease: EASE } },
};

const quickAddVariants: Variants = {
  hidden: { y: '110%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
  exit: { y: '110%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

const wishlistVariants: Variants = {
  rest: { scale: 1 },
  tap: { scale: 1.3, transition: { type: 'spring' as const, stiffness: 500, damping: 20 } },
};

const overlayVariants: Variants = {
  rest: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.3 } },
};

/* ── Star Rating ────────────────────────────────────────────── */

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.floor(rating);
  const hasHalf = rating - filled >= 0.5;

  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`${rating} out of 5 stars, ${count} reviews`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className="w-3 h-3"
            viewBox="0 0 24 24"
            style={{
              color: star <= filled || (hasHalf && star === filled + 1)
                ? 'var(--color-accent)'
                : 'var(--color-border-strong)',
            }}
            fill={star <= filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {count > 0 && (
        <span className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}

/* ── Colour Swatches ────────────────────────────────────────── */

function ColourSwatches({ colors }: { colors: string[] }) {
  if (!colors.length) return null;
  const shown = colors.slice(0, 5);
  const extra = colors.length - 5;

  return (
    <div className="flex items-center gap-1.5" role="list" aria-label="Available colours">
      {shown.map((c) => (
        <span
          key={c}
          role="listitem"
          title={c}
          aria-label={c}
          className="w-3.5 h-3.5 rounded-full border"
          style={{
            backgroundColor: c.startsWith('#') ? c : c.toLowerCase(),
            borderColor: 'var(--color-border)',
          }}
        />
      ))}
      {extra > 0 && (
        <span className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ── ProductCard ────────────────────────────────────────────── */

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setWishlisted((prev) => !prev);
    },
    []
  );

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // TODO: dispatch to cart context
    },
    []
  );

  return (
    <motion.article
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative flex flex-col bg-surface-1 border border-default"
      style={{ borderRadius: '2px' }}
    >
      <Link
        href={`/products/${product.id}`}
        className="flex flex-col flex-1"
        aria-label={`${product.title} by ${product.vendorName} — ${formatLKR(product.minPrice)}`}
        tabIndex={0}
      >
        {/* ── Image ───────────────────────────────────────── */}
        <div className="relative aspect-fashion overflow-hidden bg-surface-2">
          {product.primaryImageUrl ? (
            <motion.div
              className="absolute inset-0"
              variants={imageVariants}
            >
              <Image
                src={product.primaryImageUrl}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                priority={priority}
              />
            </motion.div>
          ) : (
            <ImagePlaceholder />
          )}

          {/* Dark overlay on hover */}
          <motion.div
            variants={overlayVariants}
            className="absolute inset-0 bg-black/20 pointer-events-none"
            aria-hidden="true"
          />

          {/* ── Badges ───────────────────────────────────── */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5" aria-live="polite">
            {!product.isInStock && (
              <span className="badge-neutral">Sold Out</span>
            )}
          </div>

          {/* ── Wishlist button ───────────────────────────── */}
          <motion.button
            variants={wishlistVariants}
            whileTap="tap"
            onClick={handleWishlist}
            aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
            aria-pressed={wishlisted}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center transition-opacity duration-200"
            style={{
              color: wishlisted ? 'var(--color-accent)' : 'white',
              opacity: isHovered || wishlisted ? 1 : 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              borderRadius: '2px',
            }}
          >
            <HeartIcon filled={wishlisted} className="w-4 h-4" />
          </motion.button>

          {/* ── Quick Add ────────────────────────────────── */}
          <AnimatePresence>
            {isHovered && product.isInStock && (
              <motion.button
                variants={quickAddVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={handleQuickAdd}
                aria-label={`Quick add ${product.title} to cart`}
                className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 h-10 text-body-s font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-inverse)',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                <PlusIcon className="w-4 h-4" />
                Quick Add
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Info ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 p-3.5 flex-1">
          {/* Vendor */}
          <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
            {product.vendorName}
          </span>

          {/* Title */}
          <h3
            className="font-sans text-body-s font-medium leading-snug line-clamp-2 transition-colors duration-150"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {product.title}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <StarRating rating={product.rating} count={product.reviewCount} />
          )}

          {/* Colours */}
          {product.colors.length > 0 && (
            <ColourSwatches colors={product.colors} />
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-auto pt-1">
            <span className="text-body-s font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {formatLKR(product.minPrice)}
            </span>
            {product.maxPrice > product.minPrice && (
              <span className="text-body-s" style={{ color: 'var(--color-text-tertiary)' }}>
                – {formatLKR(product.maxPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/* ── ProductCard Skeleton ────────────────────────────────────── */

export function ProductCardSkeleton() {
  return (
    <div
      className="flex flex-col bg-surface-1 border border-default"
      style={{ borderRadius: '2px' }}
      role="status"
      aria-label="Loading product"
    >
      <div className="aspect-fashion skeleton" />
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="skeleton h-2.5 w-16 rounded-none" />
        <div className="skeleton h-3.5 w-full rounded-none" />
        <div className="skeleton h-3 w-3/4 rounded-none" />
        <div className="skeleton h-3.5 w-20 rounded-none mt-1" />
      </div>
    </div>
  );
}
