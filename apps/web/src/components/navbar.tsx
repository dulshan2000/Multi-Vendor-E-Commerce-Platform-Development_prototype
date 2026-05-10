'use client';
import type { Variants } from 'framer-motion';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Icons ─────────────────────────────────────────────────── */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ── Nav links data ─────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'New Arrivals', href: '/search?sort=newest' },
  { label: 'Designers', href: '/search?collection=designers' },
  { label: 'Clothing', href: '/categories/clothing' },
  { label: 'Sale', href: '/flash-sales', accent: true },
];

/* ── Animation variants ─────────────────────────────────────── */

const navVariants = {
  transparent: { backgroundColor: 'rgba(10,10,10,0)', backdropFilter: 'blur(0px)', borderBottomColor: 'rgba(42,42,42,0)' },
  solid: { backgroundColor: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottomColor: 'rgba(42,42,42,1)' },
};

const searchOverlayVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const mobileMenuVariants: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 35 } },
  exit: { x: '100%', transition: { type: 'spring' as const, stiffness: 300, damping: 35 } },
};

const mobileNavItemVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
  }),
};

/* ── Icon button helper ─────────────────────────────────────── */

function IconButton({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xs text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

/* ── NavLink with hover underline ───────────────────────────── */

function NavLink({ href, label, accent }: { href: string; label: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative py-1 text-body-s font-medium tracking-wide transition-colors duration-150 ${
        accent
          ? 'text-accent hover:text-accent-hover'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
      <span
        className="absolute inset-x-0 -bottom-px h-px scale-x-0 origin-left transition-transform duration-300 ease-editorial group-hover:scale-x-100"
        style={{ backgroundColor: accent ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
        aria-hidden="true"
      />
    </Link>
  );
}

/* ── Main Navbar ────────────────────────────────────────────── */

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartCount = 0; // TODO: wire to cart context

  /* Scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Focus search input when overlay opens */
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  /* Close mobile menu on route change / resize */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Body scroll lock when mobile menu open */
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* Keyboard: close overlays on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setMobileOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* ── Main header ───────────────────────────────────────── */}
      <motion.header
        role="banner"
        variants={navVariants}
        animate={scrolled ? 'solid' : 'transparent'}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-[1030] border-b"
        style={{ height: 'var(--nav-height)' }}
      >
        <div className="container-editorial flex h-full items-center gap-6">

          {/* Wordmark */}
          <Link href="/" className="flex-shrink-0 group" aria-label="MarkComm — home">
            <span
              className="font-display font-light tracking-[0.15em] uppercase text-lg transition-colors duration-200 group-hover:text-accent"
              style={{ color: 'var(--color-text-primary)', fontStyle: 'italic' }}
            >
              Mark
              <span style={{ color: 'var(--color-accent)' }}>Comm</span>
            </span>
          </Link>

          {/* Desktop nav links — centered */}
          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-8"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} accent={link.accent} />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto lg:ml-0">

            {/* Search trigger */}
            <IconButton label="Open search" onClick={() => setSearchOpen(true)}>
              <SearchIcon className="w-5 h-5" />
            </IconButton>

            {/* Wishlist */}
            <Link href="/wishlist" aria-label="Wishlist">
              <IconButton label="Wishlist">
                <HeartIcon className="w-5 h-5" />
              </IconButton>
            </Link>

            {/* Cart */}
            <Link href="/cart" aria-label={`Cart — ${cartCount} items`}>
              <IconButton label="Cart" className="relative">
                <BagIcon className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-inverse)' }}
                    aria-hidden="true"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </IconButton>
            </Link>

            {/* Account — desktop */}
            <Link href="/login" className="hidden lg:flex" aria-label="Sign in">
              <IconButton label="Account">
                <UserIcon className="w-5 h-5" />
              </IconButton>
            </Link>

            {/* Sell CTA — desktop */}
            <Link
              href="/vendor/register"
              className="hidden lg:inline-flex ml-2 btn-secondary !px-4 !py-2 text-body-s"
            >
              Sell
            </Link>

            {/* Mobile menu toggle */}
            <IconButton
              label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden"
            >
              {mobileOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </IconButton>
          </div>
        </div>
      </motion.header>

      {/* ── Search overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1040] bg-black/80 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
              aria-hidden="true"
            />

            {/* Search panel */}
            <motion.div
              variants={searchOverlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 inset-x-0 z-[1050] border-b"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                borderColor: 'var(--color-border)',
                paddingTop: 'var(--nav-height)',
              }}
            >
              <div className="container-editorial py-6">
                <form action="/search" className="relative" role="search">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    name="q"
                    placeholder="Search products, vendors, styles..."
                    autoComplete="off"
                    className="w-full h-14 pl-12 pr-16 bg-surface-0 border font-sans text-body-s text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:border-accent"
                    style={{ borderColor: 'var(--color-border)', borderRadius: '2px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    aria-label="Close search"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </form>

                {/* Quick links */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="ui-caption text-text-tertiary mr-2 self-center">Trending:</span>
                  {['Batik Shirts', 'Handloom Sarees', 'Leather Bags', 'Cotton Dresses'].map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${encodeURIComponent(term)}`}
                      onClick={() => setSearchOpen(false)}
                      className="badge-neutral hover:border-accent hover:text-accent transition-colors duration-150"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile menu ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[1040] bg-black/60"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-[1050] flex w-80 flex-col overflow-y-auto"
              style={{ backgroundColor: 'var(--color-surface-1)', borderLeft: '1px solid var(--color-border)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-display font-light text-lg tracking-[0.1em] italic" style={{ color: 'var(--color-text-primary)' }}>
                  Mark<span style={{ color: 'var(--color-accent)' }}>Comm</span>
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile nav links */}
              <nav className="flex-1 px-6 py-8 flex flex-col gap-1" aria-label="Mobile navigation">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    custom={i}
                    variants={mobileNavItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block py-3 font-display text-heading-m tracking-wide transition-colors duration-150 ${
                        link.accent ? 'text-accent' : 'text-text-primary hover:text-accent'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                <div className="my-4 divider" aria-hidden="true" />

                {[
                  { label: 'My Account', href: '/profile' },
                  { label: 'Orders', href: '/orders' },
                  { label: 'Wishlist', href: '/wishlist' },
                ].map((link, i) => (
                  <motion.div
                    key={link.href}
                    custom={NAV_LINKS.length + i}
                    variants={mobileNavItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2.5 text-body-s text-text-secondary hover:text-text-primary transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Drawer footer CTAs */}
              <div className="px-6 pb-8 flex flex-col gap-3 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full text-center">
                  Sign In
                </Link>
                <Link href="/vendor/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-center">
                  Start Selling
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from hiding behind fixed nav */}
      <div style={{ height: 'var(--nav-height)' }} aria-hidden="true" />
    </>
  );
}
