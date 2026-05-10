'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm'
          : 'bg-white border-b border-zinc-100'
      }`}
    >
      <div className="container-xl flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-bold text-lg text-zinc-900 hidden sm:block">
            Mark<span className="text-violet-600">Comm</span>
          </span>
        </Link>

        {/* Search — desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <form action="/search" className="w-full relative">
            <input
              type="search"
              name="q"
              placeholder="Search products, vendors..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>

        {/* Nav links — desktop */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-zinc-600">
          <Link href="/search" className="px-3 py-2 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors">Explore</Link>
          <Link href="/flash-sales" className="px-3 py-2 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Flash Sales
          </Link>
          <Link href="/vendor/register" className="px-3 py-2 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors">Sell</Link>
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {/* Wishlist */}
          <Link href="/wishlist" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative flex w-9 h-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
              0
            </span>
          </Link>

          {/* Auth */}
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            Sign Up
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-zinc-100 bg-white px-4 py-3 flex flex-col gap-1">
          <form action="/search" className="mb-2">
            <input
              type="search"
              name="q"
              placeholder="Search..."
              className="w-full h-10 pl-4 pr-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </form>
          <Link href="/search" className="px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50">Explore</Link>
          <Link href="/flash-sales" className="px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Flash Sales
          </Link>
          <Link href="/vendor/register" className="px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50">Sell on MarkComm</Link>
          <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-100">
            <Link href="/login" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center border border-zinc-200 text-zinc-700 hover:bg-zinc-50">Login</Link>
            <Link href="/register" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center bg-violet-600 text-white hover:bg-violet-700">Sign Up</Link>
          </div>
        </div>
      )}
    </header>
  );
}
