'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const LK_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'NuwaraEliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
] as const;

const LK_PROVINCES = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North_Western', 'North_Central', 'Uva', 'Sabaragamuwa',
] as const;

const PAYMENT_METHODS = [
  { id: 'PAYHERE', label: 'PayHere', description: 'Credit/Debit cards, Internet Banking', icon: '💳', available: true },
  { id: 'COD', label: 'Cash on Delivery', description: 'Pay when your order arrives', icon: '💵', available: true },
  { id: 'GENIE', label: 'Dialog Genie', description: 'Dialog digital wallet', icon: '📱', available: false },
  { id: 'FRIMI', label: 'FriMi', description: 'Nations Trust Bank wallet', icon: '📱', available: false },
] as const;

function formatLKR(n: number) {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<'address' | 'payment' | 'review'>('address');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ subtotal: number; shippingFee: number; total: number } | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [payHereForm, setPayHereForm] = useState<Record<string, string> | null>(null);

  const [address, setAddress] = useState({
    recipientName: '',
    phone: '+94',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: 'Colombo' as typeof LK_DISTRICTS[number],
    province: 'Western' as typeof LK_PROVINCES[number],
    postalCode: '',
    deliveryInstructions: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'PAYHERE' | 'COD'>('PAYHERE');
  const [note, setNote] = useState('');

  // Auth helpers
  const getHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mc_access_token') : null;
    const guestToken = typeof window !== 'undefined' ? localStorage.getItem('mc_guest_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(guestToken && !token ? { 'X-Guest-Token': guestToken } : {}),
    };
  }, []);

  // Fetch totals
  useEffect(() => {
    fetch(`${API}/api/v1/orders/checkout/totals`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((j) => setTotals(j.data))
      .catch(() => {});
  }, [getHeaders]);

  const handleAddressContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.recipientName || !address.phone.match(/^\+94\d{9}$/) || !address.addressLine1 || !address.city) {
      setError('Please fill in all required address fields with valid Sri Lanka phone (+94XXXXXXXXX)');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Place order
      const orderRes = await fetch(`${API}/api/v1/orders/checkout`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          shippingAddress: { ...address, isDefault: false, label: 'HOME' },
          billingAddressSameAsShipping: true,
          note,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.error?.message ?? 'Failed to place order');

      const orderId: string = orderJson.data.id;
      setPlacedOrderId(orderId);

      // Step 2: Initiate payment
      const payRes = await fetch(`${API}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ orderId, method: paymentMethod }),
      });
      const payJson = await payRes.json();
      if (!payRes.ok) throw new Error(payJson.error?.message ?? 'Payment initiation failed');

      if (paymentMethod === 'COD') {
        router.push(`/checkout/success?orderId=${orderId}`);
        return;
      }

      if (paymentMethod === 'PAYHERE') {
        setPayHereForm(payJson.data.formData);
        setStep('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit PayHere form
  useEffect(() => {
    if (payHereForm && step === 'review') {
      const form = document.getElementById('payhere-form') as HTMLFormElement | null;
      if (form) {
        setTimeout(() => form.submit(), 1000);
      }
    }
  }, [payHereForm, step]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-xl py-20 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <Link href="/search" className="text-primary hover:underline">Continue Shopping →</Link>
      </div>
    );
  }

  return (
    <div className="container-xl py-6 md:py-10">
      <h1 className="text-2xl font-bold text-foreground mb-8">Checkout</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['address', 'payment', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? 'bg-primary text-primary-foreground' : i < ['address', 'payment', 'review'].indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {i < ['address', 'payment', 'review'].indexOf(step) ? '✓' : i + 1}
            </div>
            <span className={step === s ? 'font-semibold text-foreground' : 'text-muted-foreground capitalize'}>{s}</span>
            {i < 2 && <span className="text-border mx-1">›</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Address step */}
          {step === 'address' && (
            <form onSubmit={handleAddressContinue} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Delivery Address</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Full Name *</label>
                  <input value={address.recipientName} onChange={(e) => setAddress((a) => ({ ...a, recipientName: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. Kamal Perera" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Phone * (+94XXXXXXXXX)</label>
                  <input value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="+94771234567" required />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Address Line 1 *</label>
                <input value={address.addressLine1} onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="House/Flat no., Street" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Address Line 2</label>
                <input value={address.addressLine2} onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Estate, village, landmark" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">City *</label>
                  <input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Colombo" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">District *</label>
                  <select value={address.district} onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value as typeof address.district }))}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {LK_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Postal Code</label>
                  <input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="10000" maxLength={5} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Province *</label>
                <select value={address.province} onChange={(e) => setAddress((a) => ({ ...a, province: e.target.value as typeof address.province }))}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {LK_PROVINCES.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Delivery Instructions</label>
                <input value={address.deliveryInstructions} onChange={(e) => setAddress((a) => ({ ...a, deliveryInstructions: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Gate code, building colour, etc." />
              </div>

              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                Continue to Payment →
              </button>
            </form>
          )}

          {/* Payment step */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('address')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
                <h2 className="text-lg font-bold text-foreground">Payment Method</h2>
              </div>

              <div className="space-y-2">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all
                      ${!pm.available ? 'opacity-50 cursor-not-allowed' : ''}
                      ${paymentMethod === pm.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      disabled={!pm.available}
                      onChange={() => pm.available && setPaymentMethod(pm.id as 'PAYHERE' | 'COD')}
                      className="accent-primary"
                    />
                    <span className="text-2xl">{pm.icon}</span>
                    <div>
                      <p className="font-medium text-foreground text-sm">{pm.label}</p>
                      <p className="text-xs text-muted-foreground">{pm.description}</p>
                    </div>
                    {!pm.available && <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Coming Soon</span>}
                  </label>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Order Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="Special instructions for the vendor…" />
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isLoading}
                className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isLoading
                  ? 'Placing Order…'
                  : paymentMethod === 'COD'
                  ? 'Place Order (Cash on Delivery)'
                  : `Pay with PayHere — ${totals ? formatLKR(totals.total) : '…'}`}
              </button>
            </div>
          )}

          {/* PayHere redirect step */}
          {step === 'review' && payHereForm && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-foreground mb-2">Redirecting to PayHere…</h2>
              <p className="text-muted-foreground text-sm mb-6">You&apos;re being securely redirected to complete your payment.</p>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />

              {/* Hidden PayHere form — auto-submitted */}
              <form
                id="payhere-form"
                method="POST"
                action="https://sandbox.payhere.lk/pay/checkout"
                style={{ display: 'none' }}
              >
                {Object.entries(payHereForm).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              </form>
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        <div>
          <div className="sticky top-4 bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-base mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.variantId} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium line-clamp-1">{item.product.title}</p>
                    <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                  </div>
                  <span className="text-foreground font-medium whitespace-nowrap">{formatLKR(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            {totals && (
              <>
                <div className="border-t border-border pt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatLKR(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className={totals.shippingFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      {totals.shippingFee === 0 ? 'FREE' : formatLKR(totals.shippingFee)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary">{formatLKR(totals.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">VAT & NBT included where applicable</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
