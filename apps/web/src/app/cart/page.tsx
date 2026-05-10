'use client';

import { useCart } from '@/context/cart-context';
import Link from 'next/link';
import Image from 'next/image';

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, clearCart } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-xl py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">
          Add some products to get started!
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start Shopping →
        </Link>
      </div>
    );
  }

  const hasOutOfStock = cart.items.some((i) => !i.availability.inStock);
  const hasPriceMismatch = cart.items.some((i) => i.priceMismatch);

  return (
    <div className="container-xl py-6 md:py-10">
      <h1 className="text-2xl font-bold text-foreground mb-6">Shopping Cart ({cart.itemCount})</h1>

      {/* Warnings */}
      {hasOutOfStock && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
          ⚠️ Some items in your cart are now out of stock. Please remove them to continue.
        </div>
      )}
      {hasPriceMismatch && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-xl text-sm">
          💡 Some item prices have changed since you added them to your cart.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((item) => (
            <div
              key={item.variantId}
              className={`flex gap-4 p-4 bg-card border rounded-2xl transition-colors ${!item.availability.inStock ? 'border-rose-200 dark:border-rose-800 opacity-75' : 'border-border'}`}
            >
              {/* Image */}
              <Link href={`/products/${item.product.id}`} className="flex-shrink-0">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  {item.product.primaryImageUrl ? (
                    <Image
                      src={item.product.primaryImageUrl}
                      alt={item.product.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🛍️</div>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.id}`} className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 transition-colors">
                  {item.product.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{item.product.vendor}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {item.variant.size && <span>Size: {item.variant.size}</span>}
                  {item.variant.color && <span>Color: {item.variant.color}</span>}
                </div>

                {!item.availability.inStock && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Out of stock</span>
                )}
                {item.priceMismatch && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Price updated: {formatLKR(item.currentPrice)}
                  </span>
                )}

                <div className="flex items-center gap-3 mt-2">
                  {/* Quantity control */}
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      disabled={isLoading}
                      className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-sm disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >−</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={isLoading || item.quantity >= item.availability.availableQty}
                      className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-sm disabled:opacity-50"
                      aria-label="Increase quantity"
                    >+</button>
                  </div>

                  <button
                    onClick={() => removeItem(item.variantId)}
                    disabled={isLoading}
                    className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-foreground text-sm">{formatLKR(item.unitPrice * item.quantity)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatLKR(item.unitPrice)} each</p>
              </div>
            </div>
          ))}

          {/* Clear cart */}
          <div className="text-right pt-2">
            <button
              onClick={clearCart}
              disabled={isLoading}
              className="text-sm text-muted-foreground hover:text-rose-500 transition-colors"
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span>Subtotal ({cart.itemCount} items)</span>
                <span className="text-foreground font-medium">{formatLKR(cart.total.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {cart.total.amount >= 2500 ? 'FREE' : formatLKR(350)}
                </span>
              </div>
              {cart.total.amount < 2500 && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Add {formatLKR(2500 - cart.total.amount)} more for free shipping!
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 mb-4">
              <div className="flex justify-between font-bold text-foreground">
                <span>Total</span>
                <span>{formatLKR(cart.total.amount + (cart.total.amount >= 2500 ? 0 : 350))}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">VAT & NBT included where applicable</p>
            </div>

            <Link
              href="/checkout"
              className={`block w-full py-3.5 text-center font-semibold rounded-xl transition-all duration-200
                ${hasOutOfStock
                  ? 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                }`}
            >
              {hasOutOfStock ? 'Remove Out-of-Stock Items' : 'Proceed to Checkout'}
            </Link>

            {/* Payment logos */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['PayHere', 'Genie', 'FriMi', 'COD'].map((pm) => (
                <span key={pm} className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">{pm}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
