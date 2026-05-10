import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface OrderTrackingPageProps {
  params: Promise<{ id: string }>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';

const STATUS_STEPS = [
  { key: 'PENDING',    label: 'Order Placed',    icon: '🛍️',  description: 'Your order has been received' },
  { key: 'CONFIRMED',  label: 'Confirmed',        icon: '✅',  description: 'Vendor has confirmed your order' },
  { key: 'PROCESSING', label: 'Processing',       icon: '⚙️',  description: 'Your items are being prepared' },
  { key: 'PACKED',     label: 'Packed',           icon: '📦',  description: 'Order is packed and ready to ship' },
  { key: 'SHIPPED',    label: 'Shipped',          icon: '🚚',  description: 'Your order is on the way' },
  { key: 'DELIVERED',  label: 'Delivered',        icon: '🏠',  description: 'Order delivered to your door' },
];

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export async function generateMetadata({ params }: OrderTrackingPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Track Order | MarkComm`,
    description: `Track the status of your MarkComm order.`,
    robots: 'noindex',
  };
}

async function getOrder(id: string) {
  const res = await fetch(`${API}/api/v1/orders/${id}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';
  const addr = order.shippingAddress as Record<string, string>;

  return (
    <div className="container-xl py-6 md:py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed {new Date(order.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-full
          ${isCancelled ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
          {isCancelled ? '❌ Cancelled' : order.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Payment Pending'}
        </span>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-foreground mb-6">Shipment Progress</h2>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" style={{ zIndex: 0 }}>
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{
                  width: currentStepIndex >= 0
                    ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`
                    : '0%',
                }}
              />
            </div>

            <div className="relative flex justify-between" style={{ zIndex: 1 }}>
              {STATUS_STEPS.map((step, i) => {
                const isDone = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300
                      ${isDone
                        ? 'bg-primary border-primary shadow-md shadow-primary/25'
                        : 'bg-card border-border'
                      }
                      ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                      {step.icon}
                    </div>
                    <span className={`text-[10px] font-semibold text-center leading-tight max-w-[60px] ${isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {currentStepIndex >= 0 && (
            <p className="text-sm text-muted-foreground text-center mt-6">
              {STATUS_STEPS[currentStepIndex]?.description}
            </p>
          )}
        </div>
      )}

      {/* Vendor sub-orders */}
      {order.vendorOrders?.length > 0 && (
        <div className="space-y-4 mb-6">
          {order.vendorOrders.map((vo: {
            id: string;
            status: string;
            trackingNumber?: string;
            carrierId?: string;
            total: number;
            vendor: { businessName: string };
            items: { id: string; productTitle: string; quantity: number; unitPrice: number }[];
          }) => (
            <div key={vo.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground text-sm">📦 {vo.vendor.businessName}</span>
                <span className="text-xs text-muted-foreground capitalize">{vo.status.toLowerCase()}</span>
              </div>
              <div className="space-y-2 mb-3">
                {vo.items.map((item: { id: string; productTitle: string; quantity: number; unitPrice: number }) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.productTitle} ×{item.quantity}</span>
                    <span>{formatLKR(Number(item.unitPrice) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {vo.trackingNumber && (
                <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Tracking Number: </span>
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400">{vo.trackingNumber}</span>
                  {vo.carrierId && <span className="text-muted-foreground ml-2">via {vo.carrierId.replace('_', ' ')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items summary */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-foreground mb-4">Items Ordered</h2>
        <div className="space-y-3">
          {order.items.map((item: {
            id: string;
            productTitle: string;
            variantSku: string;
            variantSize?: string;
            variantColor?: string;
            quantity: number;
            unitPrice: number;
            total: number;
          }) => (
            <div key={item.id} className="flex justify-between items-start text-sm gap-4">
              <div>
                <p className="font-medium text-foreground">{item.productTitle}</p>
                <p className="text-xs text-muted-foreground">
                  SKU: {item.variantSku}
                  {item.variantSize && ` • Size: ${item.variantSize}`}
                  {item.variantColor && ` • Color: ${item.variantColor}`}
                  {` • Qty: ${item.quantity}`}
                </p>
              </div>
              <span className="font-medium text-foreground whitespace-nowrap">{formatLKR(Number(item.total))}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-4 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{formatLKR(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span className={Number(order.shippingFee) === 0 ? 'text-emerald-600' : ''}>{Number(order.shippingFee) === 0 ? 'FREE' : formatLKR(Number(order.shippingFee))}</span>
          </div>
          <div className="flex justify-between font-bold text-foreground mt-2 pt-2 border-t border-border">
            <span>Total</span><span className="text-primary">{formatLKR(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-bold text-foreground mb-3">Delivery Address</h2>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">{addr?.recipientName}</p>
          <p>{addr?.addressLine1}</p>
          {addr?.addressLine2 && <p>{addr.addressLine2}</p>}
          <p>{addr?.city}, {addr?.district} {addr?.postalCode}</p>
          <p>{addr?.province?.replace('_', ' ')} Province, Sri Lanka 🇱🇰</p>
          <p className="pt-1">📞 {addr?.phone}</p>
          {addr?.deliveryInstructions && <p className="pt-1 italic">📝 {addr.deliveryInstructions}</p>}
        </div>
      </div>
    </div>
  );
}
