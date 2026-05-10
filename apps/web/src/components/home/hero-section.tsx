'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay } },
});

export function HeroSection() {
  return (
    <section
      className="relative min-h-[90svh] flex items-end overflow-hidden"
      aria-label="Hero"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85"
          alt="Luxury fashion editorial"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="container-editorial relative z-10 pb-16 md:pb-24 pt-32">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <motion.div {...fadeUp(0)} className="flex items-center gap-3 mb-6">
            <span className="accent-line" />
            <span className="ui-label" style={{ color: 'var(--color-accent)' }}>
              New Season — SS&apos;26
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fadeUp(0.1)}
            className="display-2xl mb-6"
            style={{ color: '#F5F5F3', fontStyle: 'italic' }}
          >
            Wear What<br />
            <em style={{ color: 'var(--color-accent)', fontStyle: 'normal' }}>Matters</em>
          </motion.h1>

          {/* Sub */}
          <motion.p
            {...fadeUp(0.2)}
            className="text-body-m max-w-md mb-10 leading-relaxed"
            style={{ color: 'rgba(245,245,243,0.65)' }}
          >
            Curated fashion from Sri Lanka&apos;s finest independent designers.
            Discover pieces built to last a lifetime.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-4">
            <Link href="/search" className="btn-primary">
              Explore Collection
            </Link>
            <Link
              href="/vendor/register"
              className="btn-secondary"
              style={{ borderColor: 'rgba(245,245,243,0.3)', color: '#F5F5F3' }}
            >
              Sell With Us
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="ui-label" style={{ color: 'rgba(245,245,243,0.4)', writingMode: 'vertical-rl' }}>
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-12"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      </motion.div>
    </section>
  );
}
