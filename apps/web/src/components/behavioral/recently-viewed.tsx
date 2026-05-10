'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

interface RecentProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  imageUrl?: string;
}

interface RecentlyViewedProps {
  limit?: number;
  title?: string;
  className?: string;
}

export function RecentlyViewed({ limit = 6, title = 'Recently Viewed', className = '' }: RecentlyViewedProps) {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch_products = useCallback(async () => {
    const token = localStorage.getItem('mc_access_token');
    const guestToken = localStorage.getItem('mc_guest_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(guestToken && !token ? { 'X-Guest-Token': guestToken } : {}),
    };

    try {
      const res = await fetch(`${API}/api/v1/behavioral/recently-viewed?limit=${limit}`, { headers });
      const json = await res.json();
      setProducts(json.data ?? []);
    } catch { /* graceful fail */ } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch_products(); }, [fetch_products]);

  if (isLoading || products.length === 0) return null;

  return (
    <section className={`${className}`}>
      <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  width={120}
                  height={120}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
              )}
            </div>
            <p className="text-xs text-foreground font-medium line-clamp-2 leading-tight">{product.title}</p>
            <p className="text-xs font-bold text-primary">{formatLKR(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Trending Products ──────────────────────────────────────────

export function TrendingProducts({ limit = 8, className = '' }: { limit?: number; className?: string }) {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/behavioral/trending?limit=${limit}`)
      .then((r) => r.json())
      .then((j) => setProducts(j.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [limit]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <h2 className="text-lg font-bold text-foreground mb-4">🔥 Trending Now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className={`${className}`}>
      <h2 className="text-lg font-bold text-foreground mb-4">🔥 Trending Now</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((product, i) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group relative flex flex-col gap-1.5"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
              )}
              {/* Rank badge */}
              {i < 3 && (
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm
                  ${i === 0 ? 'bg-amber-400 text-amber-900' : i === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-300 text-orange-900'}`}>
                  #{i + 1}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-foreground line-clamp-2">{product.title}</p>
            <p className="text-xs font-bold text-primary">{formatLKR(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
