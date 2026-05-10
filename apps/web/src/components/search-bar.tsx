'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { SearchSuggestion } from '@/lib/api';

interface SearchBarProps {
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ defaultValue = '', className = '' }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${API}/api/v1/search/suggest?q=${encodeURIComponent(q)}&limit=5`);
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setIsOpen(true);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-xl ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative flex items-center">
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="Search products, brands, categories…"
            className="w-full h-11 pl-4 pr-12 text-sm bg-muted/60 border border-border rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                       placeholder:text-muted-foreground transition-all"
            autoComplete="off"
            aria-label="Search products"
            aria-expanded={isOpen}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg"
            aria-label="Search"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
        >
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/products/${s.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
              role="option"
              onClick={() => setIsOpen(false)}
            >
              {s.primaryImageUrl && (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image src={s.primaryImageUrl} alt={s.title} fill className="object-cover" sizes="40px" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{s.title}</span>
                <span className="text-xs text-muted-foreground">Rs. {s.minPrice.toLocaleString('en-LK')}</span>
              </div>
            </Link>
          ))}
          <div className="px-4 py-2 border-t border-border">
            <button
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="text-xs text-primary hover:underline"
            >
              See all results for &ldquo;{query}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
