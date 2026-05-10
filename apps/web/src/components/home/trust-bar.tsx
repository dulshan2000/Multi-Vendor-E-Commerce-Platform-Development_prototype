const TRUST_ITEMS = [
  {
    label: 'Secure Payments',
    detail: 'PayHere · Genie · FriMi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Island-wide Delivery',
    detail: 'Domex · PickMe · Lanka Post',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'Easy Returns',
    detail: '14-day hassle-free returns',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.09" />
      </svg>
    ),
  },
  {
    label: 'Authentic Vendors',
    detail: 'Verified Sri Lankan sellers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function TrustBar() {
  return (
    <div
      className="border-b border-t"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-1)' }}
      role="region"
      aria-label="Trust and service features"
    >
      <div className="container-editorial">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ '--tw-divide-opacity': '1', borderColor: 'var(--color-border)' } as React.CSSProperties}>
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-5">
              <span style={{ color: 'var(--color-accent)' }}>{item.icon}</span>
              <div>
                <p className="text-body-s font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {item.label}
                </p>
                <p className="ui-caption mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
