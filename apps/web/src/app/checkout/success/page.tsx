import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Confirmed | MarkComm',
  description: 'Your order has been placed successfully. Thank you for shopping with MarkComm!',
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return (
    <div className="container-xl py-20 text-center max-w-lg mx-auto">
      {/* Animated checkmark */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed! 🎉</h1>
      <p className="text-muted-foreground mb-6 leading-relaxed">
        Thank you for shopping with MarkComm! Your order has been placed successfully.
        A confirmation email has been sent to your inbox.
      </p>

      {orderId && (
        <div className="bg-muted/50 border border-border rounded-xl px-6 py-4 mb-8 inline-block">
          <p className="text-sm text-muted-foreground mb-1">Order ID</p>
          <p className="font-mono font-bold text-foreground text-sm">{orderId}</p>
        </div>
      )}

      {/* Delivery info */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
        <h2 className="font-bold text-foreground mb-3">What happens next?</h2>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Vendor receives your order and begins processing', icon: '📦' },
            { step: '2', text: 'Your order is packed and handed to Domex, PickMe, or Lanka Post', icon: '🚚' },
            { step: '3', text: 'You receive an email with your tracking number', icon: '📧' },
            { step: '4', text: 'Delivered island-wide within 2–5 business days', icon: '🏠' },
          ].map(({ step, text, icon }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
              <p className="text-sm text-muted-foreground">
                <span className="mr-2">{icon}</span>{text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Track Order
          </Link>
        )}
        <Link
          href="/search"
          className="px-6 py-3 bg-card border border-border font-semibold rounded-xl hover:bg-muted transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
