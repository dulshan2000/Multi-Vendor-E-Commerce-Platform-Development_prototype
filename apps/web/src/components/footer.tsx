'use client';

import Link from 'next/link';

/* ── Data ───────────────────────────────────────────────────── */

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { label: "Women's Fashion", href: '/categories/womens-fashion' },
      { label: "Men's Fashion", href: '/categories/mens-fashion' },
      { label: 'New Arrivals', href: '/search?sort=newest' },
      { label: 'Sale', href: '/flash-sales' },
      { label: 'Designers', href: '/search?collection=designers' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'Start Selling', href: '/vendor/register' },
      { label: 'Vendor Dashboard', href: '/vendor/dashboard' },
      { label: 'Commission Rates', href: '/vendor/pricing' },
      { label: 'Seller Guidelines', href: '/vendor/guidelines' },
      { label: 'Success Stories', href: '/vendor/stories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Track Order', href: '/orders' },
      { label: 'Returns & Refunds', href: '/help/returns' },
      { label: 'Shipping Info', href: '/help/shipping' },
      { label: 'Size Guide', href: '/help/sizes' },
      { label: 'Contact Us', href: '/help/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About MarkComm', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Sustainability', href: '/sustainability' },
      { label: 'Careers', href: '/careers' },
    ],
  },
];

const paymentMethods = [
  'PayHere',
  'Dialog Genie',
  'FriMi',
  'Visa / Mastercard',
  'Cash on Delivery',
];

const socials = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/markcomm.lk',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/markcomm',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Pinterest',
    href: 'https://pinterest.com/markcomm',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.03-2.83.19-.77 1.26-5.33 1.26-5.33s-.32-.64-.32-1.59c0-1.49.87-2.61 1.94-2.61.92 0 1.36.69 1.36 1.52 0 .92-.59 2.3-.89 3.58-.25 1.07.53 1.94 1.58 1.94 1.9 0 3.36-2 3.36-4.9 0-2.56-1.84-4.35-4.47-4.35-3.04 0-4.83 2.28-4.83 4.64 0 .92.35 1.9.8 2.43.09.1.1.19.07.29-.08.33-.26 1.07-.3 1.22-.05.2-.16.24-.38.14-1.39-.65-2.26-2.68-2.26-4.32 0-3.51 2.55-6.74 7.35-6.74 3.86 0 6.86 2.75 6.86 6.42 0 3.83-2.41 6.91-5.76 6.91-1.13 0-2.19-.59-2.55-1.28l-.69 2.59c-.25.96-.93 2.16-1.39 2.89.97.3 2 .46 3.06.46 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
      </svg>
    ),
  },
];

/* ── Newsletter Form ────────────────────────────────────────── */

function NewsletterForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex gap-0"
      aria-label="Newsletter subscription"
    >
      <input
        type="email"
        name="email"
        placeholder="Your email address"
        required
        autoComplete="email"
        className="flex-1 h-11 px-4 bg-transparent border font-sans text-body-s text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:border-accent"
        style={{ borderColor: 'var(--color-border)', borderRadius: '2px 0 0 2px' }}
        aria-label="Email address for newsletter"
      />
      <button
        type="submit"
        className="btn-primary !rounded-none !px-5 flex-shrink-0"
        style={{ borderRadius: '0 2px 2px 0' }}
      >
        Subscribe
      </button>
    </form>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */

export function Footer() {
  return (
    <footer
      className="mt-20 border-t"
      style={{
        backgroundColor: '#0A0A0A',  /* Always dark regardless of theme */
        borderColor: 'var(--color-border)',
      }}
      role="contentinfo"
    >
      {/* ── Top: Newsletter + Social ─────────────────────────── */}
      <div
        className="container-editorial py-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-md">
          <p className="ui-label text-text-tertiary mb-2">Newsletter</p>
          <h2 className="font-display text-heading-l font-light mb-4" style={{ color: '#F5F5F3' }}>
            The Edit — curated weekly
          </h2>
          <NewsletterForm />
        </div>

        {/* Social links */}
        <div className="flex flex-col gap-4">
          <p className="ui-label text-text-tertiary">Follow Us</p>
          <div className="flex gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`MarkComm on ${s.label}`}
                className="flex h-10 w-10 items-center justify-center border transition-colors duration-200 hover:border-accent hover:text-accent"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: '2px',
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Middle: Link columns ─────────────────────────────── */}
      <div className="container-editorial py-12 grid grid-cols-2 md:grid-cols-4 gap-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {footerColumns.map((col) => (
          <div key={col.title}>
            <p className="ui-label mb-5" style={{ color: 'var(--color-text-tertiary)' }}>
              {col.title}
            </p>
            <ul className="space-y-3" role="list">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-s transition-colors duration-150 hover:text-accent"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Payments + Delivery ──────────────────────────────── */}
      <div className="container-editorial py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="ui-label mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Secure Payments
          </p>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((pm) => (
              <span
                key={pm}
                className="badge-neutral text-[10px]"
                style={{ fontSize: '10px', letterSpacing: '0.06em' }}
              >
                {pm}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="ui-label mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Island-wide Delivery
          </p>
          <div className="flex flex-wrap gap-2">
            {['Domex', 'PickMe Delivery', 'Lanka Post EMS', 'DHL Express'].map((d) => (
              <span key={d} className="badge-neutral text-[10px]" style={{ fontSize: '10px', letterSpacing: '0.06em' }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <div className="container-editorial py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Wordmark */}
          <span
            className="font-display font-light text-base tracking-[0.15em] italic"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Mark<span style={{ color: 'var(--color-accent)' }}>Comm</span>
          </span>
          <span className="divider h-3 w-px bg-border inline-block" aria-hidden="true" />
          <span className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
            © {new Date().getFullYear()} Mark &amp; Comm (Pvt) Ltd.
          </span>
        </div>
        <span className="ui-caption" style={{ color: 'var(--color-text-tertiary)' }}>
          🇱🇰 Crafted with pride in Sri Lanka
        </span>
      </div>
    </footer>
  );
}
