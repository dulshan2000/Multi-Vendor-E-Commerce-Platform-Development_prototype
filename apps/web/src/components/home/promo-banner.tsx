import Link from 'next/link';
import Image from 'next/image';

export function PromoBanner() {
  return (
    <section
      className="relative overflow-hidden border-t border-b"
      style={{ borderColor: 'var(--color-border)' }}
      aria-label="Promotional offer"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&q=80"
          alt="Fashion editorial"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/65" />
      </div>

      <div className="container-editorial relative z-10 py-20 md:py-28 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6">
          <span className="accent-line" />
          <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
            Limited Offer
          </span>
          <span className="accent-line" />
        </div>

        <h2
          className="display-xl mb-4"
          style={{ color: '#F5F5F3', fontStyle: 'italic' }}
        >
          Free Shipping<br />
          <span style={{ color: 'var(--color-accent)' }}>on Rs. 2,500+</span>
        </h2>

        <p className="text-body-m mb-2" style={{ color: 'rgba(245,245,243,0.6)' }}>
          Island-wide delivery · Valid on all categories
        </p>

        <div
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 border font-mono text-sm tracking-widest"
          style={{
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-dim)',
            borderRadius: '2px',
          }}
        >
          FREESHIP
        </div>

        <Link
          href="/search"
          className="btn-primary"
        >
          Shop Now
        </Link>
      </div>
    </section>
  );
}
