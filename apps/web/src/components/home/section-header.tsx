import Link from 'next/link';

interface SectionHeaderProps {
  id?: string;
  eyebrow: string;
  title: string;
  linkHref?: string;
  linkLabel?: string;
}

export function SectionHeader({ id, eyebrow, title, linkHref, linkLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="accent-line" aria-hidden="true" />
          <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
            {eyebrow}
          </span>
        </div>
        <h2
          id={id}
          className="display-m font-light"
          style={{ color: 'var(--color-text-primary)', fontStyle: 'italic' }}
        >
          {title}
        </h2>
      </div>

      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="flex-shrink-0 flex items-center gap-2 text-body-s font-medium transition-colors duration-150 hover:text-accent pb-1"
          style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
          aria-label={`${linkLabel} — ${title}`}
        >
          {linkLabel}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
