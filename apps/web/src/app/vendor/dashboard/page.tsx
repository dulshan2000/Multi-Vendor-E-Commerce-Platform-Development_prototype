'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:    { label: 'Pending',    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',    icon: '⏳' },
  CONFIRMED:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',        icon: '✅' },
  PROCESSING: { label: 'Processing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: '⚙️' },
  PACKED:     { label: 'Packed',     color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', icon: '📦' },
  SHIPPED:    { label: 'Shipped',    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',            icon: '🚚' },
  DELIVERED:  { label: 'Delivered',  color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '🏠' },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',        icon: '❌' },
};

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

interface VendorOrder {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  trackingNumber?: string;
  carrierId?: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  order: { orderNumber: string; createdAt: string; shippingAddress: Record<string, string> };
  items: {
    id: string;
    productTitle: string;
    variantSku: string;
    variantSize?: string;
    variantColor?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

interface Analytics {
  grossRevenue: number;
  netRevenue: number;
  commission: number;
  orderCount: number;
  paidOrderCount: number;
  avgOrderValue: number;
  currency: string;
  ordersByStatus: Record<string, number>;
}

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'PACKED',
  PACKED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export default function VendorDashboardPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'payouts'>('orders');
  const [balance, setBalance] = useState<{ netPayable: number; grossRevenue: number; commission: number; pendingOrderCount: number } | null>(null);

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('mc_access_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}&limit=20` : '?limit=20';
      const [ordersRes, analyticsRes, balanceRes] = await Promise.all([
        fetch(`${API}/api/v1/orders/vendor${qs}`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/analytics/vendor?period=${period}`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/settlements/balance`, { headers: getHeaders() }),
      ]);
      const [oJson, aJson, bJson] = await Promise.all([ordersRes.json(), analyticsRes.json(), balanceRes.json()]);
      setOrders(oJson.data ?? []);
      setAnalytics(aJson.data);
      setBalance(bJson.data);
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, statusFilter, period]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const tracking = trackingInputs[orderId];
    await fetch(`${API}/api/v1/orders/vendor/${orderId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus, trackingNumber: tracking }),
    });
    fetchOrders();
  };

  return (
    <div className="container-xl py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your orders, products, and payouts</p>
        </div>
        <Link href="/vendor/products/new" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
          + Add Product
        </Link>
      </div>

      {/* Quick stats */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Gross Revenue', value: formatLKR(analytics.grossRevenue), sub: `Last ${period}`, color: 'text-emerald-600' },
            { label: 'Net Revenue', value: formatLKR(analytics.netRevenue), sub: `After 10% commission`, color: 'text-primary' },
            { label: 'Total Orders', value: analytics.orderCount.toLocaleString(), sub: `${analytics.paidOrderCount} paid`, color: 'text-foreground' },
            { label: 'Avg Order Value', value: formatLKR(analytics.avgOrderValue), sub: 'LKR', color: 'text-amber-600' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6">
        {(['orders', 'analytics', 'payouts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Orders Tab ─────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].map((s) => (
              <button
                key={s || 'ALL'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              >
                {s ? (STATUS_CONFIG[s]?.icon + ' ' + STATUS_CONFIG[s]?.label) : 'All Orders'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">📦</div>
              <p className="font-medium">No orders yet</p>
              <p className="text-sm">Orders from customers will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING'];
                const nextStatus = NEXT_STATUS[order.status];
                const addr = order.order.shippingAddress;
                const needsTracking = order.status === 'PACKED';

                return (
                  <div key={order.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground">#{order.order.orderNumber}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatLKR(Number(order.total))}</p>
                        <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground line-clamp-1">{item.productTitle}</span>
                            <span className="text-xs text-muted-foreground ml-2">×{item.quantity}</span>
                            {(item.variantSize || item.variantColor) && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({[item.variantSize, item.variantColor].filter(Boolean).join(', ')})
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground flex-shrink-0">{formatLKR(Number(item.total))}</span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery address */}
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      🚚 Ship to: {addr?.recipientName}, {addr?.addressLine1}, {addr?.city}, {addr?.district}
                      {order.trackingNumber && <span className="ml-2 text-primary font-medium">Tracking: {order.trackingNumber}</span>}
                    </div>

                    {/* Actions */}
                    {nextStatus && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {needsTracking && (
                          <input
                            type="text"
                            placeholder="Tracking number (e.g. EMS123456LK)"
                            value={trackingInputs[order.id] ?? ''}
                            onChange={(e) => setTrackingInputs((t) => ({ ...t, [order.id]: e.target.value }))}
                            className="flex-1 min-w-0 h-9 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        )}
                        <button
                          onClick={() => updateStatus(order.id, nextStatus)}
                          className="flex-shrink-0 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Mark as {STATUS_CONFIG[nextStatus]?.label}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Analytics Tab ───────────────────────────────────────── */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>

          {/* Revenue breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Gross Revenue', value: formatLKR(analytics.grossRevenue), icon: '💰', color: 'text-emerald-600' },
              { label: 'Platform Commission (10%)', value: formatLKR(analytics.commission), icon: '🏦', color: 'text-rose-500' },
              { label: 'Net Revenue', value: formatLKR(analytics.netRevenue), icon: '✅', color: 'text-primary' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Order status breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-4">Orders by Status</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.ordersByStatus).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${cfg?.color ?? 'bg-muted text-muted-foreground'}`}>
                    {cfg?.icon} {cfg?.label ?? status}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Payouts Tab ──────────────────────────────────────────── */}
      {activeTab === 'payouts' && balance && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4">Pending Balance</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Gross Revenue', value: formatLKR(balance.grossRevenue) },
                { label: 'Commission (10%)', value: `- ${formatLKR(balance.commission)}` },
                { label: 'Net Payable', value: formatLKR(balance.netPayable) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Based on {balance.pendingOrderCount} delivered orders awaiting settlement.
              Payouts are processed weekly by the platform admin.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
            💡 Payouts are processed every Friday via bank transfer to your registered bank account.
            Ensure your bank details are up to date in your vendor profile.
          </div>

          <div className="text-center">
            <Link href="/vendor/settings/payout" className="text-sm text-primary hover:underline font-medium">
              Update Bank Account Details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
