'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

interface PlatformStats {
  period: string;
  gmv: number;
  commission: number;
  orderCount: number;
  paidOrderCount: number;
  newVendors: number;
  newCustomers: number;
  pendingApprovals: number;
  avgOrderValue: number;
  conversionRate: string;
  topVendors: { vendorId: string; businessName: string; revenue: number; orderCount: number }[];
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

interface PendingVendor {
  id: string;
  businessName: string;
  ownerName: string;
  createdAt: string;
  email?: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'settlements'>('overview');

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('mc_access_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, vendorsRes] = await Promise.all([
        fetch(`${API}/api/v1/analytics/platform?period=${period}`, { headers: getHeaders() }),
        fetch(`${API}/api/v1/vendors?status=PENDING_REVIEW&limit=10`, { headers: getHeaders() }),
      ]);
      const [sJson, vJson] = await Promise.all([statsRes.json(), vendorsRes.json()]);
      setStats(sJson.data);
      setPendingVendors(vJson.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approveVendor = async (id: string) => {
    await fetch(`${API}/api/v1/vendors/${id}/approve`, { method: 'POST', headers: getHeaders() });
    fetchData();
  };

  const rejectVendor = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    await fetch(`${API}/api/v1/vendors/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    fetchData();
  };

  // Simple sparkline using SVG
  const Sparkline = ({ data }: { data: { revenue: number }[] }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data.map((d) => d.revenue), 1);
    const w = 120; const h = 40;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.revenue / max) * h}`).join(' ');
    return (
      <svg width={w} height={h} className="opacity-60">
        <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="container-xl py-6 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform health & management</p>
        </div>
        {stats?.pendingApprovals !== undefined && stats.pendingApprovals > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-medium">
            ⚠️ {stats.pendingApprovals} vendor{stats.pendingApprovals !== 1 ? 's' : ''} awaiting approval
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
            {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {/* Key metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'GMV', value: formatLKR(stats.gmv), sub: 'Gross Merchandise Value', icon: '💰', color: 'text-emerald-600', trend: stats.revenueByDay },
            { label: 'Commission', value: formatLKR(stats.commission), sub: '10% platform fee', icon: '🏦', color: 'text-primary' },
            { label: 'Orders', value: stats.orderCount.toLocaleString(), sub: `${stats.paidOrderCount} paid (${stats.conversionRate}% conversion)`, icon: '📦', color: 'text-foreground' },
            { label: 'Avg Order', value: formatLKR(stats.avgOrderValue), sub: 'Average order value (LKR)', icon: '🎯', color: 'text-amber-600' },
          ].map(({ label, value, sub, icon, color, trend }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <span className="text-xl">{icon}</span>
              </div>
              <p className={`text-xl font-bold ${color} mb-1`}>{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
              {trend && <Sparkline data={trend} />}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6">
        {(['overview', 'vendors', 'settlements'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab}
            {tab === 'vendors' && pendingVendors.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingVendors.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────── */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order status distribution */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-4">Orders by Status</h3>
            <div className="space-y-2">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => {
                const total = Object.values(stats.ordersByStatus).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{status}</span><span>{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top vendors */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-4">Top Vendors by Revenue</h3>
            <div className="space-y-3">
              {stats.topVendors.map((v, i) => (
                <div key={v.vendorId} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.businessName}</p>
                      <p className="text-xs text-muted-foreground">{v.orderCount} orders</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{formatLKR(v.revenue)}</span>
                </div>
              ))}
              {stats.topVendors.length === 0 && <p className="text-sm text-muted-foreground">No vendor data yet</p>}
            </div>
          </div>

          {/* Platform health */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-4">Growth Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'New Vendors', value: stats.newVendors, icon: '🏪' },
                { label: 'New Customers', value: stats.newCustomers, icon: '👤' },
                { label: 'Pending Approvals', value: stats.pendingApprovals, icon: '⏳' },
                { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: '📈' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="text-center p-3 bg-muted/50 rounded-xl">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Vendors Tab ───────────────────────────────────────────── */}
      {activeTab === 'vendors' && (
        <div>
          <h2 className="font-bold text-foreground mb-4">
            Pending Vendor Approvals
            {pendingVendors.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({pendingVendors.length})</span>
            )}
          </h2>
          {pendingVendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">✅</div>
              <p>No vendors pending approval</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVendors.map((vendor) => (
                <div key={vendor.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-foreground">{vendor.businessName}</p>
                    <p className="text-sm text-muted-foreground">{vendor.ownerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applied {new Date(vendor.createdAt).toLocaleDateString('en-LK')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => rejectVendor(vendor.id)}
                      className="px-3 py-1.5 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveVendor(vendor.id)}
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Settlements Tab ───────────────────────────────────────── */}
      {activeTab === 'settlements' && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">💸</div>
          <p className="font-medium mb-2">Settlement Management</p>
          <p className="text-sm mb-6">Create and manage vendor payouts from here</p>
          <Link href="/admin/settlements" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
            Open Settlement Manager →
          </Link>
        </div>
      )}
    </div>
  );
}
