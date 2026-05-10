'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Cart, CartItem } from '@/lib/api';

// ── Constants ──────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const GUEST_TOKEN_KEY = 'mc_guest_token';

// ── Guest token management ──────────────────────────────────────

function getOrCreateGuestToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

// ── Context ────────────────────────────────────────────────────

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mc_access_token') : null;
    const guestToken = getOrCreateGuestToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Guest-Token': guestToken }),
    };
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API}/api/v1/cart`, { headers: authHeaders() });
      const json = await res.json();
      setCart(json.data);
    } catch {
      // Silently fail — cart will be empty
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/cart/items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ variantId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to add item');
      setCart(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  const updateQuantity = useCallback(async (variantId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/cart/items/${variantId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      setCart(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  const removeItem = useCallback(async (variantId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/cart/items/${variantId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      setCart(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  const clearCart = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch(`${API}/api/v1/cart`, { method: 'DELETE', headers: authHeaders() });
      setCart({ items: [], itemCount: 0, total: { amount: 0, currency: 'LKR' } });
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  return (
    <CartContext.Provider value={{ cart, isLoading, addItem, updateQuantity, removeItem, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
