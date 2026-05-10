'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/cart-context';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    images: { url: string; altText: string | null }[];
    variants: { price: number; comparePrice: number | null }[];
    vendor: { businessName: string };
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem, isLoading: cartLoading } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'added' | 'error'>>({});

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('mc_access_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/wishlist`, { headers: getHeaders() });
      const json = await res.json();
      setItems(json.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const removeItem = async (productId: string) => {
    await fetch(`${API}/api/v1/wishlist/${productId}`, { method: 'DELETE', headers: getHeaders() });
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddToCart = async (item: WishlistItem) => {
    setAddingId(item.productId);
    try {
      // Add first variant — user can select properly on PDP
      const res = await fetch(`${API}/api/v1/products/${item.productId}`, { headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      const firstVariantId = json.data?.variants?.[0]?.id;
      if (!firstVariantId) throw new Error('No variant available');
      await addItem(firstVariantId, 1);
      setFeedback((f) => ({ ...f, [item.productId]: 'added' }));
      setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[item.productId]; return n; }), 2500);
    } catch {
      setFeedback((f) => ({ ...f, [item.productId]: 'error' }));
      setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[item.productId]; return n; }), 2500);
    } finally {
      setAddingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container-xl py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-xl py-6 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {items.length > 0 && (
          <Link href="/search" className="text-sm text-primary hover:underline font-medium">
            Continue Shopping →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-6xl mb-4">💝</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-8">Save products you love to buy them later</p>
          <Link href="/search" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
            Discover Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const variant = item.product.variants[0];
            const price = variant ? Number(variant.price) : 0;
            const comparePrice = variant?.comparePrice ? Number(variant.comparePrice) : null;
            const image = item.product.images[0];
            const fb = feedback[item.productId];

            return (
              <div key={item.id} className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                  aria-label="Remove from wishlist"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>

                {/* Image */}
                <Link href={`/products/${item.productId}`} className="block aspect-square bg-muted overflow-hidden">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.altText ?? item.product.title}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex flex-col gap-2 p-3 flex-1">
                  <span className="text-xs text-muted-foreground">{item.product.vendor.businessName}</span>
                  <Link href={`/products/${item.productId}`} className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {item.product.title}
                  </Link>
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-base font-bold text-foreground">{formatLKR(price)}</span>
                    {comparePrice && comparePrice > price && (
                      <span className="text-xs text-muted-foreground line-through">{formatLKR(comparePrice)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!!addingId || cartLoading}
                    className={`w-full py-2 text-xs font-semibold rounded-lg transition-all duration-200
                      ${fb === 'added'
                        ? 'bg-emerald-500 text-white'
                        : fb === 'error'
                        ? 'bg-rose-500 text-white'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                      }
                      ${addingId === item.productId ? 'opacity-70' : ''}`}
                  >
                    {fb === 'added' ? '✓ Added to Cart' : fb === 'error' ? '✗ Try Again' : addingId === item.productId ? 'Adding…' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
