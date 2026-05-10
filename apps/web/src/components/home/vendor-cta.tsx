import Link from 'next/link';

const STATS = [
  { stat: '500+', label: 'Active Vendors' },
  { stat: '10,000+', label: 'Products' },
  { stat: '50,000+', label: 'Customers' },
  { stat: '10%', label: 'Commission' },
];

export function VendorCTA() {
  return (
    <section
      className="border-t section-gap-lg"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface-1)',
      }}
      aria-labelledby="vendor-cta-heading"
    >
      <div className="container-editorial">
        <div className="flex flex-col lg:flex-row gap-16 items-start justify-between">

          {/* Left — copy */}
          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="accent-line" />
              <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
                Sell With Us
              </span>
            </div>

            <h2
              id="vendor-cta-heading"
              className="display-l mb-6 font-light"
              style={{ color: 'var(--color-text-primary)', fontStyle: 'italic' }}
            >
              Grow Your<br />
              <span style={{ color: 'var(--color-accent)' }}>Business</span> Online
            </h2>

            <p
              className="text-body-m leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Join hundreds of Sri Lankan vendors already selling on MarkComm.
              Set up your storefront in minutes — no upfront fees, only 10% commission on sales.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/vendor/register" className="btn-primary">
                Start Selling Free
              </Link>
              <Link href="/search" className="btn-secondary">
                Browse Marketplace
              </Link>
            </div>
          </div>

          {/* Right — stats */}
          <div className="grid grid-cols-2 gap-0 flex-shrink-0 border" style={{ borderColor: 'var(--color-border)' }}>
            {STATS.map(({ stat, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center p-8 border-b border-r last:border-r-0 text-center"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="display-m mb-1"
                  style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}
                >
                  {stat}
                </span>
                <span className="ui-label" style={{ color: 'var(--color-text-tertiary)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
