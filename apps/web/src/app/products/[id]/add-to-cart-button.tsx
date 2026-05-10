'use client';

import { useState } from 'react';
import { useCart } from '@/context/cart-context';

interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  comparePrice: number | null;
  isDefault: boolean;
  availableQty: number;
}

interface AddToCartButtonProps {
  productId: string;
  variants: Variant[];
}

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AddToCartButton({ variants }: AddToCartButtonProps) {
  const { addItem, isLoading } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    variants.find((v) => v.isDefault) ?? variants[0]!,
  );
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];

  const isOutOfStock = selectedVariant.availableQty <= 0;
  const maxQty = Math.min(selectedVariant.availableQty, 99);

  const handleAddToCart = async () => {
    try {
      await addItem(selectedVariant.id, quantity);
      setFeedback({ type: 'success', message: '✓ Added to cart!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add to cart' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Variant selectors */}
      {sizes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Size: <span className="text-muted-foreground font-normal">{selectedVariant.size ?? 'Select size'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const variantForSize = variants.find((v) => v.size === size && (selectedVariant.color ? v.color === selectedVariant.color : true));
              const available = (variantForSize?.availableQty ?? 0) > 0;
              const isSelected = selectedVariant.size === size;
              return (
                <button
                  key={size}
                  onClick={() => variantForSize && setSelectedVariant(variantForSize)}
                  disabled={!available}
                  className={`px-3 py-1.5 text-sm border rounded-lg transition-colors
                    ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}
                    ${!available ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Color: <span className="text-muted-foreground font-normal">{selectedVariant.color ?? 'Select color'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const variantForColor = variants.find((v) => v.color === color && (selectedVariant.size ? v.size === selectedVariant.size : true));
              const available = (variantForColor?.availableQty ?? 0) > 0;
              const isSelected = selectedVariant.color === color;
              return (
                <button
                  key={color}
                  onClick={() => variantForColor && setSelectedVariant(variantForColor)}
                  disabled={!available}
                  title={color}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                    ${isSelected ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border'}
                    ${!available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ backgroundColor: color.startsWith('#') ? color : color.toLowerCase() }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Price update for selected variant */}
      {variants.length > 1 && (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-foreground">{formatLKR(selectedVariant.price)}</span>
          {selectedVariant.comparePrice && selectedVariant.comparePrice > selectedVariant.price && (
            <>
              <span className="text-base text-muted-foreground line-through">{formatLKR(selectedVariant.comparePrice)}</span>
              <span className="text-sm text-emerald-600 font-semibold">
                {Math.round((1 - selectedVariant.price / selectedVariant.comparePrice) * 100)}% off
              </span>
            </>
          )}
        </div>
      )}

      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-foreground">Quantity:</p>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg"
            aria-label="Increase quantity"
            disabled={quantity >= maxQty || isOutOfStock}
          >
            +
          </button>
        </div>
        {!isOutOfStock && selectedVariant.availableQty <= 10 && (
          <span className="text-xs text-amber-600 font-medium">Only {selectedVariant.availableQty} left!</span>
        )}
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock || isLoading}
        className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200
          ${isOutOfStock
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-md'
          }
          ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Adding…
          </span>
        ) : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>

      {/* Feedback toast */}
      {feedback && (
        <div className={`text-sm text-center py-2 px-4 rounded-lg font-medium
          ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'}`}
        >
          {feedback.message}
        </div>
      )}

      {/* SKU */}
      <p className="text-xs text-muted-foreground">SKU: {selectedVariant.sku}</p>
    </div>
  );
}
