import Link from 'next/link';
import { ArrowRight, ShoppingBag, Star, Truck, Shield, RefreshCcw } from 'lucide-react';

// SSR page — personalized hero with ISR
export const revalidate = 60; // Revalidate every 60 seconds

export default function HomePage() {
  return (
    <main>
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-zinc-900">MarkComm</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="/shop" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">Shop</Link>
            <Link href="/vendors" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">Vendors</Link>
            <Link href="/deals" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">Deals</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 py-24 text-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-3xl" />
        </div>

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge-violet mb-6 inline-flex border border-violet-400/20 bg-violet-500/20 text-violet-200">
              🇱🇰 Sri Lanka&apos;s Premier Fashion Marketplace
            </span>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Discover Sri Lanka&apos;s{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Finest Fashion
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-violet-200 sm:text-xl">
              Shop from hundreds of curated Sri Lankan fashion brands. From Colombo boutiques to
              artisan workshops — all in one marketplace.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/shop" className="btn-primary bg-amber-500 text-zinc-900 hover:bg-amber-400 px-8 py-3 text-base">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sell" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 px-8 py-3 text-base">
                Sell on MarkComm
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-10">
              {[
                { value: '500+', label: 'Local Vendors' },
                { value: '25K+', label: 'Products' },
                { value: 'Island-wide', label: 'Delivery' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="font-display text-3xl font-bold text-white">{value}</div>
                  <div className="mt-1 text-sm text-violet-300">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────────────── */}
      <section className="border-b border-zinc-200 bg-white py-10">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: Truck, title: 'Island-wide Delivery', desc: 'Delivered to all 9 provinces' },
              { icon: Shield, title: 'Secure Payments', desc: 'PayHere, Visa, Mastercard, eZ Cash' },
              { icon: RefreshCcw, title: 'Easy Returns', desc: '14-day hassle-free returns' },
              { icon: Star, title: 'Verified Vendors', desc: 'All vendors are vetted & approved' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100">
                  <Icon className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{title}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Grid ────────────────────────────────────── */}
      <section className="bg-zinc-50 py-16">
        <div className="container-page">
          <div className="text-center">
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">Find your style across our curated collections</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: 'Women', emoji: '👗', href: '/shop/women' },
              { name: 'Men', emoji: '👔', href: '/shop/men' },
              { name: 'Kids', emoji: '🧸', href: '/shop/kids' },
              { name: 'Traditional', emoji: '🪷', href: '/shop/traditional' },
              { name: 'Accessories', emoji: '💍', href: '/shop/accessories' },
              { name: 'Footwear', emoji: '👠', href: '/shop/footwear' },
            ].map(({ name, emoji, href }) => (
              <Link
                key={name}
                href={href}
                className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-center
                  shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{emoji}</span>
                <span className="text-sm font-semibold text-zinc-700 group-hover:text-violet-600">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payment Methods Banner ────────────────────────────── */}
      <section className="bg-white py-12">
        <div className="container-page text-center">
          <p className="text-sm font-medium text-zinc-500">Accepted payment methods</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            {['Visa', 'Mastercard', 'PayHere', 'eZ Cash', 'mCash', 'Dialog Genie', 'FriMi', 'Cash on Delivery'].map(
              (method) => (
                <span
                  key={method}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm"
                >
                  {method}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Vendor CTA ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-violet-600 to-purple-700 py-20 text-white">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Grow Your Fashion Business
            </h2>
            <p className="mt-4 text-lg text-violet-200">
              Join hundreds of Sri Lankan fashion vendors on MarkComm. Reach thousands of
              customers island-wide with zero upfront cost.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sell" className="btn-primary bg-white text-violet-700 hover:bg-zinc-100 px-8 py-3 text-base">
                Start Selling Today <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sell#how-it-works" className="text-sm font-medium text-violet-200 hover:text-white underline underline-offset-4">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-zinc-900 py-16 text-zinc-400">
        <div className="container-page">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
                  <ShoppingBag className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-display text-lg font-bold text-white">MarkComm</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                Sri Lanka&apos;s premier multi-vendor fashion marketplace. Supporting local fashion
                brands since 2026.
              </p>
              <p className="mt-4 text-xs">Mark &amp; Comm (Pvt) Ltd, Colombo, Sri Lanka 🇱🇰</p>
            </div>
            {[
              {
                title: 'Shop',
                links: [
                  { label: 'Women\'s Fashion', href: '/shop/women' },
                  { label: 'Men\'s Fashion', href: '/shop/men' },
                  { label: 'Traditional Wear', href: '/shop/traditional' },
                  { label: 'New Arrivals', href: '/shop/new' },
                  { label: 'Sale', href: '/shop/sale' },
                ],
              },
              {
                title: 'Vendors',
                links: [
                  { label: 'Start Selling', href: '/sell' },
                  { label: 'Vendor Login', href: '/vendor/login' },
                  { label: 'Vendor Guide', href: '/vendor/guide' },
                  { label: 'Commission Rates', href: '/vendor/commission' },
                ],
              },
              {
                title: 'Support',
                links: [
                  { label: 'Help Centre', href: '/help' },
                  { label: 'Track Order', href: '/track' },
                  { label: 'Returns Policy', href: '/returns' },
                  { label: 'Contact Us', href: '/contact' },
                  { label: 'Privacy Policy', href: '/privacy' },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
                <ul className="mt-4 space-y-2">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm hover:text-white transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-xs text-zinc-600">
            © 2026 Mark &amp; Comm (Pvt) Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
