'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pending',    color: 'badge-neutral' },
  CONFIRMED:  { label: 'Confirmed',  color: 'badge-success' },
  PROCESSING: { label: 'Processing', color: 'badge-neutral' },
  PACKED:     { label: 'Packed',     color: 'badge-neutral' },
  SHIPPED:    { label: 'Shipped',    color: 'badge-accent' },
  DELIVERED:  { label: 'Delivered',  color: 'badge-success' },
  CANCELLED:  { label: 'Cancelled',  color: 'badge-destructive' },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PROCESSING',
  PROCESSING: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'DELIVERED',
};

interface VendorOrder {
  id: string; status: string; total: number;
  trackingNumber?: string; createdAt: string;
  order: { orderNumber: string; shippingAddress: Record<string, string> };
  items: { id: string; productTitle: string; variantSize?: string; variantColor?: string; quantity: number; total: number }[];
}

interface Analytics {
  grossRevenue: number; netRevenue: number; commission: number;
  orderCount: number; paidOrderCount: number; avgOrderValue: number;
  ordersByStatus: Record<string, number>;
}

/* ── Metric Card ────────────────────────────────────────────── */

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5 border border-default"
      style={{ borderRadius: '2px' }}
    >
      <p className="ui-label mb-3" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
      <p
        className="text-display-m font-light"
        style={{ color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)', fontFamily: 'var(--font-cormorant)' }}
      >
        {value}
      </p>
      <p className="ui-caption mt-2" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>
    </motion.div>
  );
}

/* ── Sidebar nav ────────────────────────────────────────────── */

const SIDEBAR_NAV = [
  { label: 'Overview', tab: 'orders' as const, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )},
  { label: 'Orders', tab: 'orders' as const, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  )},
  { label: 'Analytics', tab: 'analytics' as const, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  )},
  { label: 'Payouts', tab: 'payouts' as const, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  )},
];

/* ── Main Dashboard ─────────────────────────────────────────── */

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('mc_access_token') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}&limit=20` : '?limit=20';
      const [oRes, aRes, bRes] = await Promise.all([
        fetch(`${API}/api/v1/orders/vendor${qs}`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/analytics/vendor?period=${period}`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/settlements/balance`, { headers: getHeaders() }),
      ]);
      const [oJson, aJson, bJson] = await Promise.all([oRes.json(), aRes.json(), bRes.json()]);
      setOrders(oJson.data ?? []);
      setAnalytics(aJson.data);
      setBalance(bJson.data);
    } catch {
      // Silent fail — API may not be running in dev
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, statusFilter, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    await fetch(`${API}/api/v1/orders/vendor/${orderId}/status`, {
      method: 'PATCH', headers: getHeaders(),
      body: JSON.stringify({ status: newStatus, trackingNumber: trackingInputs[orderId] }),
    });
    fetchData();
  };

  return (
    <div className="flex min-h-screen bg-surface-0">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-default sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface-1)' }}
        aria-label="Vendor dashboard navigation"
      >
        <div className="p-6 border-b border-default">
          <p className="ui-label" style={{ color: 'var(--color-text-tertiary)' }}>Vendor Portal</p>
        </div>
        <nav className="p-3 flex flex-col gap-0.5">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 px-3 py-2.5 text-body-s font-medium transition-colors duration-150 text-left w-full relative ${
                activeTab === item.tab ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
              style={{ borderRadius: '2px' }}
              aria-current={activeTab === item.tab ? 'page' : undefined}
            >
              {activeTab === item.tab && (
                <span
                  className="absolute left-0 inset-y-0 w-0.5"
                  style={{ backgroundColor: 'var(--color-accent)', borderRadius: '0 2px 2px 0' }}
                  aria-hidden="true"
                />
              )}
              <span style={{ color: activeTab === item.tab ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-default">
          <Link
            href="/vendor/products/new"
            className="btn-primary w-full text-center text-body-s block"
          >
            + Add Product
          </Link>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">
        <div className="container-editorial max-w-none py-8 px-6 lg:px-8">

          {/* Page header */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="accent-line" aria-hidden="true" />
                <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
                  {activeTab === 'orders' ? 'Orders' : activeTab === 'analytics' ? 'Analytics' : 'Payouts'}
                </span>
              </div>
              <h1 className="display-m" style={{ color: 'var(--color-text-primary)' }}>
                Vendor Dashboard
              </h1>
            </div>
            {/* Mobile tab switcher */}
            <div className="flex lg:hidden gap-1">
              {(['orders', 'analytics', 'payouts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-body-s font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-text-primary border-b-2'
                      : 'text-text-tertiary'
                  }`}
                  style={{ borderColor: activeTab === tab ? 'var(--color-accent)' : 'transparent' }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI cards ──────────────────────────────────── */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Gross Revenue" value={formatLKR(analytics.grossRevenue)} sub={`Last ${period}`} accent />
              <MetricCard label="Net Revenue" value={formatLKR(analytics.netRevenue)} sub="After 10% commission" />
              <MetricCard label="Total Orders" value={analytics.orderCount.toLocaleString()} sub={`${analytics.paidOrderCount} paid`} />
              <MetricCard label="Avg. Order" value={formatLKR(analytics.avgOrderValue)} sub="Per transaction" />
            </div>
          )}

          {/* ── ORDERS TAB ─────────────────────────────────── */}
          {activeTab === 'orders' && (
            <section aria-label="Order management">
              {/* Status filter pills */}
              <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter orders by status">
                {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].map((s) => (
                  <button
                    key={s || 'ALL'}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-body-s font-medium border transition-colors duration-150 ${
                      statusFilter === s
                        ? 'border-accent text-accent bg-accent-dim'
                        : 'border-default text-text-tertiary hover:border-accent hover:text-accent'
                    }`}
                    style={{ borderRadius: '2px' }}
                    aria-pressed={statusFilter === s}
                  >
                    {s ? (STATUS_CONFIG[s]?.label ?? s) : 'All Orders'}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-32 w-full" style={{ borderRadius: '2px' }} />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-20 border border-default text-center"
                  style={{ borderRadius: '2px' }}
                >
                  <svg className="w-12 h-12 mb-4" style={{ color: 'var(--color-text-tertiary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <p className="text-body font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>No orders yet</p>
                  <p className="text-body-s" style={{ color: 'var(--color-text-tertiary)' }}>Orders from customers will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order, i) => {
                    const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING'];
                    const nextStatus = NEXT_STATUS[order.status];
                    const addr = order.order.shippingAddress;

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="border border-default p-5 space-y-4"
                        style={{ backgroundColor: 'var(--color-surface-1)', borderRadius: '2px' }}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-body-s font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                #{order.order.orderNumber}
                              </span>
                              <span className={statusCfg.color}>
                                {statusCfg.label}
                              </span>
                            </div>
                            <p className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
                              {new Date(order.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-body-s font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {formatLKR(Number(order.total))}
                            </p>
                            <p className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-1.5 border-t border-default pt-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2">
                              <span className="text-body-s line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                                {item.productTitle}
                                {(item.variantSize || item.variantColor) && (
                                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                                    {' '}({[item.variantSize, item.variantColor].filter(Boolean).join(', ')})
                                  </span>
                                )}
                                {' '}<span style={{ color: 'var(--color-text-tertiary)' }}>×{item.quantity}</span>
                              </span>
                              <span className="text-body-s flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                                {formatLKR(Number(item.total))}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Shipping address */}
                        <div
                          className="flex items-start gap-2 px-3 py-2 text-body-s border-t border-default pt-3"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>
                            {addr?.recipientName}, {addr?.addressLine1}, {addr?.city}
                            {order.trackingNumber && (
                              <span style={{ color: 'var(--color-accent)' }}>
                                {' '}· Tracking: {order.trackingNumber}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Actions */}
                        {nextStatus && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <div className="flex items-center gap-3 flex-wrap border-t border-default pt-3">
                            {order.status === 'PACKED' && (
                              <input
                                type="text"
                                placeholder="Tracking number (e.g. EMS123456LK)"
                                value={trackingInputs[order.id] ?? ''}
                                onChange={(e) => setTrackingInputs((t) => ({ ...t, [order.id]: e.target.value }))}
                                aria-label="Tracking number"
                                className="flex-1 min-w-0 h-9 px-3 text-body-s border border-default bg-surface-0 focus:outline-none focus:border-accent transition-colors"
                                style={{ borderRadius: '2px', color: 'var(--color-text-primary)' }}
                              />
                            )}
                            <button
                              onClick={() => updateStatus(order.id, nextStatus)}
                              className="btn-primary !py-2 flex-shrink-0"
                            >
                              Mark as {STATUS_CONFIG[nextStatus]?.label}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── ANALYTICS TAB ──────────────────────────────── */}
          {activeTab === 'analytics' && analytics && (
            <section aria-label="Vendor analytics">
              {/* Period selector */}
              <div className="flex gap-2 mb-6" role="group" aria-label="Select analytics period">
                {(['7d', '30d', '90d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 text-body-s font-medium border transition-colors duration-150 ${
                      period === p
                        ? 'border-accent text-accent bg-accent-dim'
                        : 'border-default text-text-tertiary hover:border-accent'
                    }`}
                    style={{ borderRadius: '2px' }}
                    aria-pressed={period === p}
                  >
                    {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
                  </button>
                ))}
              </div>

              {/* Revenue breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Gross Revenue', value: formatLKR(analytics.grossRevenue), accent: true },
                  { label: 'Platform Commission (10%)', value: `− ${formatLKR(analytics.commission)}`, accent: false },
                  { label: 'Net Revenue', value: formatLKR(analytics.netRevenue), accent: true },
                ].map(({ label, value, accent }) => (
                  <div
                    key={label}
                    className="border border-default p-6"
                    style={{ backgroundColor: 'var(--color-surface-1)', borderRadius: '2px' }}
                  >
                    <p className="ui-label mb-3" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
                    <p
                      className="text-display-m font-light"
                      style={{
                        color: accent ? 'var(--color-accent)' : 'var(--color-destructive)',
                        fontFamily: 'var(--font-cormorant)',
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order status breakdown */}
              <div
                className="border border-default p-6"
                style={{ backgroundColor: 'var(--color-surface-1)', borderRadius: '2px' }}
              >
                <h3 className="heading-m mb-5" style={{ color: 'var(--color-text-primary)' }}>
                  Orders by Status
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                    <div key={status} className={STATUS_CONFIG[status]?.color ?? 'badge-neutral'}>
                      {STATUS_CONFIG[status]?.label ?? status}: {count}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── PAYOUTS TAB ────────────────────────────────── */}
          {activeTab === 'payouts' && balance && (
            <section aria-label="Payout information">
              <div
                className="border border-default p-6 mb-4"
                style={{ backgroundColor: 'var(--color-surface-1)', borderRadius: '2px' }}
              >
                <h2 className="heading-m mb-6" style={{ color: 'var(--color-text-primary)' }}>
                  Pending Balance
                </h2>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {[
                    { label: 'Gross Revenue', value: formatLKR(balance.grossRevenue) },
                    { label: 'Commission (10%)', value: `− ${formatLKR(balance.commission)}` },
                    { label: 'Net Payable', value: formatLKR(balance.netPayable) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="ui-label mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
                      <p className="text-body-l font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-body-s" style={{ color: 'var(--color-text-tertiary)' }}>
                  Based on {balance.pendingOrderCount} delivered orders awaiting settlement.
                  Payouts are processed weekly by the platform admin.
                </p>
              </div>

              <div
                className="border border-default p-4 mb-4 text-body-s"
                style={{
                  backgroundColor: 'var(--color-accent-dim)',
                  borderColor: 'var(--color-accent-muted)',
                  color: 'var(--color-accent)',
                  borderRadius: '2px',
                }}
              >
                Payouts are processed every Friday via bank transfer to your registered bank account.
                Ensure your bank details are up to date in your vendor profile.
              </div>

              <Link href="/vendor/settings/payout" className="text-body-s font-medium hover:text-accent transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                Update Bank Account Details →
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
