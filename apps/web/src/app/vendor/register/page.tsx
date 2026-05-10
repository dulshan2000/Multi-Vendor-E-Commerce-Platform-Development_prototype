'use client';

import Link from 'next/link';
import { useState } from 'react';

const BENEFITS = [
  { icon: '🛒', title: 'Instant Storefront', desc: 'Set up your store in minutes with a custom URL and branding.' },
  { icon: '💳', title: 'Multiple Payouts', desc: 'Receive payments via bank transfer, Dialog Genie, or FriMi weekly.' },
  { icon: '📦', title: 'Delivery Partners', desc: 'Ship island-wide with Domex, PickMe Delivery & Lanka Post EMS.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time sales, revenue, and customer insights at your fingertips.' },
  { icon: '🔒', title: 'Secure & Trusted', desc: 'SSL-secured transactions. Buyers pay through PayHere — funds held safely.' },
  { icon: '💬', title: 'Seller Support', desc: 'Dedicated account manager and 24/7 live chat support.' },
];

const STEPS = [
  { n: '01', title: 'Create Account', desc: 'Register with your email and basic business details.' },
  { n: '02', title: 'Submit Documents', desc: 'Upload your BR certificate and NIC for verification.' },
  { n: '03', title: 'Get Approved', desc: 'Our team reviews your application within 24 hours.' },
  { n: '04', title: 'Start Selling', desc: 'List products, set prices, and start earning today!' },
];

export default function VendorRegisterPage() {
  const [step, setStep] = useState<'landing' | 'form'>('landing');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);

    try {
      const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

      // 1. Register user
      const regRes = await fetch(`${API}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: fd.get('email'),
          password: fd.get('password'),
          firstName: fd.get('firstName'),
          lastName: fd.get('lastName'),
          role: 'VENDOR_OWNER',
        }),
      });

      if (!regRes.ok) {
        const d = await regRes.json();
        throw new Error(d?.error?.message ?? 'Registration failed');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mx-auto mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">Application Submitted!</h1>
          <p className="text-zinc-500 mb-6">
            Your vendor account has been created. Our team will review your application and approve it within <strong>24 hours</strong>. You&apos;ll receive a confirmation email at the address you provided.
          </p>
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-violet-800 mb-2">Next steps:</p>
            <ul className="text-sm text-violet-700 space-y-1 list-disc list-inside">
              <li>Check your email for a verification link</li>
              <li>Prepare your BR certificate and NIC scan</li>
              <li>Our team will contact you within 24 hours</li>
            </ul>
          </div>
          <Link href="/login" className="inline-flex px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-all">
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep('landing')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8">
            <div className="text-center mb-8">
              <div className="text-3xl mb-3">🏪</div>
              <h1 className="text-2xl font-bold text-zinc-900">Create Vendor Account</h1>
              <p className="text-zinc-500 text-sm mt-1">Start selling on MarkComm in minutes</p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">First Name</label>
                  <input name="firstName" type="text" required placeholder="Amara"
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Last Name</label>
                  <input name="lastName" type="text" required placeholder="Silva"
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Business Email</label>
                <input name="email" type="email" required placeholder="you@business.lk"
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
                <input name="password" type="password" required placeholder="Min. 8 characters, 1 uppercase, 1 number"
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                💡 After registration, you&apos;ll complete your business profile (BR number, address, bank details) in your vendor dashboard.
              </div>

              <div className="flex items-start gap-2">
                <input id="agree" type="checkbox" required className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
                <label htmlFor="agree" className="text-xs text-zinc-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-violet-600 underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-violet-600 underline">Privacy Policy</Link>
                  . I understand the 10% platform commission on all sales.
                </label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-60 transition-all shadow-sm active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : 'Create Vendor Account'}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-400 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-600 font-medium hover:text-violet-700">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-violet-950 to-zinc-900 text-white py-20 md:py-28">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, violet 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="container-xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
            🇱🇰 Join 500+ Sri Lankan vendors
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
            Sell to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              50,000+
            </span>
            <br />Customers Island-Wide
          </h1>
          <p className="text-lg text-zinc-300 max-w-xl mx-auto mb-8">
            Launch your online store today. No upfront fees. Get paid weekly. We handle the payments, you focus on your products.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setStep('form')}
              className="px-8 py-4 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-900/50 text-lg"
            >
              Start Selling Free →
            </button>
            <Link href="/login" className="px-8 py-4 bg-white/10 border border-white/20 font-semibold rounded-2xl hover:bg-white/20 transition-all text-lg">
              Already a vendor? Login
            </Link>
          </div>
          <p className="text-xs text-zinc-500 mt-4">No credit card required · Approval in 24 hours · 10% commission only on sales</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="container-xl py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: '500+', label: 'Active Vendors' },
            { stat: '50,000+', label: 'Customers' },
            { stat: 'Rs. 10M+', label: 'Monthly GMV' },
            { stat: '10%', label: 'Commission Rate' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-violet-600">{stat}</div>
              <div className="text-sm text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container-xl py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900">Everything you need to grow</h2>
          <p className="text-zinc-500 mt-2">Tools and support to help Sri Lankan businesses thrive online</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="p-6 bg-white border border-zinc-200 rounded-2xl hover:border-violet-300 hover:shadow-md hover:shadow-violet-100 transition-all">
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-bold text-zinc-900 mb-1">{b.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50 border-y border-zinc-200">
        <div className="container-xl py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900">How it works</h2>
            <p className="text-zinc-500 mt-2">From sign-up to first sale in 4 simple steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-violet-200" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4 relative z-10">
                  {s.n}
                </div>
                <h3 className="font-bold text-zinc-900 mb-1">{s.title}</h3>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-xl py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Ready to start selling?</h2>
          <p className="text-zinc-500 mb-8">Join hundreds of Sri Lankan vendors earning on MarkComm. Free to start, 10% commission only when you make a sale.</p>
          <button
            onClick={() => setStep('form')}
            className="px-10 py-4 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-all shadow-lg text-lg"
          >
            Create Free Vendor Account →
          </button>
        </div>
      </section>
    </div>
  );
}
