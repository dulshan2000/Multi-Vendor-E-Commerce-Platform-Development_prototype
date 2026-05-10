import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Flash Sales — Limited Time Deals | MarkComm',
  description: 'Grab limited-time flash deals on top products at discounted prices. Offers available island-wide in Sri Lanka.',
};

const API = process.env.API_URL ?? 'http://localhost:4000';

function formatLKR(n: number) {
  return `Rs. ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

async function getFlashSales() {
  try {
    const res = await fetch(`${API}/api/v1/flash-sales/active`, { next: { revalidate: 60 } });
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  // Server renders initial time; client hydrates with live countdown
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
      ⏱
      {[
        { v: h, l: 'h' },
        { v: m, l: 'm' },
        { v: s, l: 's' },
      ].map(({ v, l }) => (
        <span key={l} className="bg-rose-100 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
          {String(v).padStart(2, '0')}{l}
        </span>
      ))}
    </div>
  );
}

interface FlashSaleItem {
  id: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  stockLimit: number | null;
  soldCount: number;
  variant: {
    id: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    product: {
      id: string;
      title: string;
      slug: string;
      images: { url: string; altText: string | null }[];
    };
  };
}

interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  items: FlashSaleItem[];
}

function calcFlashPrice(item: FlashSaleItem) {
  const orig = Number(item.variant.price);
  if (item.discountType === 'PERCENTAGE') return orig * (1 - Number(item.discountValue) / 100);
  return Math.max(0, orig - Number(item.discountValue));
}

function StockBar({ limit, sold }: { limit: number; sold: number }) {
  const pct = Math.min(100, Math.round((sold / limit) * 100));
  const remaining = limit - sold;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Sold: {sold}</span>
        <span className={remaining < 10 ? 'text-rose-500 font-bold' : ''}>{remaining} left</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function FlashSalesPage() {
  const sales: FlashSale[] = await getFlashSales();

  return (
    <div className="container-xl py-6 md:py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400 px-6 py-10 md:px-12 text-white mb-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl animate-bounce">⚡</span>
            <h1 className="text-3xl md:text-4xl font-black">Flash Sales</h1>
          </div>
          <p className="text-white/90 text-lg max-w-lg">
            Limited-time deals on top products. Prices you won&apos;t believe — delivered island-wide across Sri Lanka.
          </p>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔔</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No active flash sales right now</h2>
          <p className="text-muted-foreground mb-6">Check back soon — new deals drop every week!</p>
          <Link href="/search" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {sales.map((sale) => (
            <section key={sale.id}>
              {/* Sale header */}
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{sale.name}</h2>
                  {sale.description && <p className="text-sm text-muted-foreground mt-1">{sale.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">Ends in</span>
                  <CountdownTimer endsAt={sale.endsAt} />
                </div>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sale.items.map((item) => {
                  const flashPrice = calcFlashPrice(item);
                  const originalPrice = Number(item.variant.price);
                  const savingsPct = Math.round(((originalPrice - flashPrice) / originalPrice) * 100);
                  const image = item.variant.product.images[0];
                  const isSoldOut = item.stockLimit !== null && item.soldCount >= item.stockLimit;

                  return (
                    <Link
                      key={item.id}
                      href={`/products/${item.variant.product.id}`}
                      className={`group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${isSoldOut ? 'opacity-60' : ''}`}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {image ? (
                          <Image
                            src={image.url}
                            alt={image.altText ?? item.variant.product.title}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
                        )}
                        {/* Discount badge */}
                        <span className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          -{savingsPct}%
                        </span>
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SOLD OUT</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{item.variant.product.title}</p>
                        <div className="mt-auto space-y-2">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-bold text-rose-600 dark:text-rose-400">{formatLKR(flashPrice)}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatLKR(originalPrice)}</span>
                          </div>
                          {item.stockLimit && (
                            <StockBar limit={item.stockLimit} sold={item.soldCount} />
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
