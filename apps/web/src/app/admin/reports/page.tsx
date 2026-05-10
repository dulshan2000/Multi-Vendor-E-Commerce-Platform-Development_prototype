'use client';

import { useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ReportType = 'VENDOR_ORDERS' | 'PLATFORM_GMV' | 'SETTLEMENT_HISTORY';

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: string }[] = [
  { id: 'PLATFORM_GMV', label: 'Platform GMV', description: 'All paid orders: revenue, commission, payment method breakdown', icon: '💰' },
  { id: 'VENDOR_ORDERS', label: 'Vendor Orders', description: 'Order line-items with product, quantity, price, tracking number', icon: '📦' },
  { id: 'SETTLEMENT_HISTORY', label: 'Settlement History', description: 'Payouts: gross revenue, commission, net payable, bank reference', icon: '💸' },
];

interface ReportStatus {
  status: 'PENDING' | 'DONE' | 'FAILED';
  rowCount?: number;
  format?: string;
  error?: string;
}

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('PLATFORM_GMV');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<{ requestId: string; type: ReportType; status: ReportStatus; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('mc_access_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        type: reportType,
        format: 'CSV',
        period: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
      };
      if (vendorId.trim()) body.vendorId = vendorId.trim();

      const res = await fetch(`${API}/api/v1/reports/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to queue report');

      const requestId = json.data.requestId;
      const label = `${REPORT_TYPES.find((r) => r.id === reportType)?.label} (${from} → ${to})`;
      const newReq = { requestId, type: reportType, status: { status: 'PENDING' as const }, label };
      setRequests((prev) => [newReq, ...prev]);

      // Poll for completion
      const poll = setInterval(async () => {
        const statusRes = await fetch(`${API}/api/v1/reports/status/${requestId}`, { headers: getHeaders() });
        const statusJson = await statusRes.json();
        const s: ReportStatus = statusJson.data;
        setRequests((prev) => prev.map((r) => r.requestId === requestId ? { ...r, status: s } : r));
        if (s.status === 'DONE' || s.status === 'FAILED') clearInterval(poll);
      }, 2000);

      setTimeout(() => clearInterval(poll), 120_000); // Stop polling after 2 minutes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = (requestId: string) => {
    const token = localStorage.getItem('mc_access_token');
    const url = `${API}/api/v1/reports/download/${requestId}`;
    // Trigger download via anchor
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `report-${requestId}.csv`);
    if (token) {
      // Fetch with auth then create object URL
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const objUrl = URL.createObjectURL(blob);
          a.href = objUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objUrl);
        });
    } else {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="container-xl py-6 md:py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Report Generation</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate CSV exports for orders, GMV, and settlement history</p>
      </div>

      {/* Report builder */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h2 className="font-bold text-foreground mb-5">New Report</h2>

        {/* Report type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {REPORT_TYPES.map((rt) => (
            <label key={rt.id}
              className={`flex flex-col gap-2 p-4 border rounded-xl cursor-pointer transition-all
                ${reportType === rt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <input type="radio" name="reportType" value={rt.id} checked={reportType === rt.id}
                onChange={() => setReportType(rt.id)} className="sr-only" />
              <span className="text-2xl">{rt.icon}</span>
              <span className="font-semibold text-sm text-foreground">{rt.label}</span>
              <span className="text-xs text-muted-foreground">{rt.description}</span>
            </label>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        {/* Vendor filter */}
        {(reportType === 'VENDOR_ORDERS' || reportType === 'SETTLEMENT_HISTORY') && (
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1">Vendor ID (optional — leave blank for all vendors)</label>
            <input type="text" value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              placeholder="cld_xxxxxxxxxxxx"
              className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono" />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 dark:text-rose-400 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        <button onClick={generateReport} disabled={isLoading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70">
          {isLoading ? 'Queuing Report…' : '⬇️ Generate CSV Report'}
        </button>
      </div>

      {/* Report history */}
      {requests.length > 0 && (
        <div>
          <h2 className="font-bold text-foreground mb-4">Generated Reports</h2>
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.requestId} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-foreground text-sm">{req.label}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{req.requestId.slice(0, 8)}…</p>
                </div>
                <div className="flex items-center gap-3">
                  {req.status.status === 'PENDING' && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Generating…
                    </div>
                  )}
                  {req.status.status === 'DONE' && (
                    <>
                      <span className="text-xs text-emerald-600 font-medium">✅ {req.status.rowCount} rows</span>
                      <button onClick={() => downloadReport(req.requestId)}
                        className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">
                        ⬇ Download CSV
                      </button>
                    </>
                  )}
                  {req.status.status === 'FAILED' && (
                    <span className="text-xs text-rose-600">❌ {req.status.error ?? 'Failed'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
