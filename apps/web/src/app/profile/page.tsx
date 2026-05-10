'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-purple-100 text-purple-800',
  PACKED:     'bg-indigo-100 text-indigo-800',
  SHIPPED:    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  DELIVERED:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED:  'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳', CONFIRMED: '✅', PROCESSING: '⚙️', PACKED: '📦', SHIPPED: '🚚', DELIVERED: '🏠', CANCELLED: '❌',
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  _count: { items: number };
  items: { id: string; productTitle: string; quantity: number }[];
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderMeta, setOrderMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'returns' | 'addresses'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('mc_access_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const fetchData = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const qs = [`page=${page}`, `limit=10`];
      if (statusFilter) qs.push(`status=${statusFilter}`);
      const [profileRes, ordersRes] = await Promise.all([
        fetch(`${API}/api/v1/auth/me`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/orders?${qs.join('&')}`, { headers: getHeaders() }),
      ]);
      const [pJson, oJson] = await Promise.all([profileRes.json(), ordersRes.json()]);
      setProfile(pJson.data);
      setOrders(oJson.data ?? []);
      setOrderMeta(oJson.meta ?? { total: 0, page: 1, limit: 10 });
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="container-xl py-6 md:py-10">
      {/* Profile header */}
      {profile && (
        <div className="flex items-center gap-4 mb-8 p-5 bg-card border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile.firstName} {profile.lastName}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(profile.createdAt).toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto flex gap-3">
            <Link href="/wishlist" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <span>💝</span> Wishlist
            </Link>
            <Link href="/profile/edit" className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
              Edit Profile
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6">
        {(['orders', 'returns', 'addresses'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'orders' ? `Orders (${orderMeta.total})` : tab === 'returns' ? 'Returns' : 'Addresses'}
          </button>
        ))}
      </div>

      {/* ── Orders Tab ────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
              <button key={s || 'ALL'} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                {s ? `${STATUS_ICON[s]} ${s.charAt(0) + s.slice(1).toLowerCase()}` : 'All Orders'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-foreground font-medium mb-1">No orders yet</p>
              <p className="text-muted-foreground text-sm mb-6">Your order history will appear here</p>
              <Link href="/search" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl">
                Start Shopping →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-foreground text-sm">#{order.orderNumber}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[order.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {STATUS_ICON[order.status]} {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{order._count.items} item{order._count.items !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatLKR(Number(order.total))}</p>
                      <span className={`text-xs ${order.paymentStatus === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {order.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Payment Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Item preview */}
                  <div className="text-xs text-muted-foreground mb-3 line-clamp-1">
                    {order.items.map((i) => `${i.productTitle} ×${i.quantity}`).join(', ')}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/orders/${order.id}`}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                      Track Order
                    </Link>
                    {order.status === 'DELIVERED' && (
                      <Link href={`/returns/new?orderId=${order.id}`}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Request Return
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {orderMeta.total > orderMeta.limit && (
                <div className="flex justify-center gap-2 pt-4">
                  {orderMeta.page > 1 && (
                    <button onClick={() => fetchData(orderMeta.page - 1)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                      ← Previous
                    </button>
                  )}
                  <span className="px-4 py-2 text-sm text-muted-foreground">
                    Page {orderMeta.page} of {Math.ceil(orderMeta.total / orderMeta.limit)}
                  </span>
                  {orderMeta.page < Math.ceil(orderMeta.total / orderMeta.limit) && (
                    <button onClick={() => fetchData(orderMeta.page + 1)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                      Next →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Returns Tab ───────────────────────────────────────────── */}
      {activeTab === 'returns' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">↩️</div>
          <p className="font-medium text-foreground mb-2">Return Requests</p>
          <p className="text-sm text-muted-foreground mb-6">View and manage your return requests here</p>
          <Link href="/returns" className="text-sm text-primary hover:underline font-medium">
            View Return History →
          </Link>
        </div>
      )}

      {/* ── Addresses Tab ──────────────────────────────────────────── */}
      {activeTab === 'addresses' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📍</div>
          <p className="font-medium text-foreground mb-2">Saved Addresses</p>
          <p className="text-sm text-muted-foreground mb-6">Manage your delivery addresses for faster checkout</p>
          <Link href="/profile/addresses" className="text-sm text-primary hover:underline font-medium">
            Manage Addresses →
          </Link>
        </div>
      )}
    </div>
  );
}
