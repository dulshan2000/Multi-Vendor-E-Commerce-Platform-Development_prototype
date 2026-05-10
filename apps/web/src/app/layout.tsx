import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Toaster } from 'sonner';
import './globals.css';

/* ── Typography ────────────────────────────────────────────── */

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

/* ── Metadata ───────────────────────────────────────────────── */

export const metadata: Metadata = {
  metadataBase: new URL('https://markcomm.lk'),
  title: {
    default: 'MarkComm — Sri Lanka\'s Luxury Multi-Vendor Marketplace',
    template: '%s | MarkComm',
  },
  description:
    'Discover curated fashion and lifestyle products from verified Sri Lankan vendors. Premium quality, islandwide delivery.',
  keywords: [
    'sri lanka fashion',
    'online marketplace',
    'luxury shopping',
    'multi-vendor',
    'local vendors',
    'fashion',
    'lifestyle',
  ],
  authors: [{ name: 'Mark & Comm (Pvt) Ltd' }],
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    siteName: 'MarkComm',
    title: 'MarkComm — Sri Lanka\'s Luxury Multi-Vendor Marketplace',
    description:
      'Discover curated fashion and lifestyle products from verified Sri Lankan vendors.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MarkComm',
    description: 'Sri Lanka\'s premier fashion marketplace.',
  },
  robots: { index: true, follow: true },
};

/* ── Layout ────────────────────────────────────────────────── */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`${cormorant.variable} ${dmSans.variable} font-sans antialiased min-h-screen flex flex-col bg-surface-0 text-primary`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster
              position="bottom-right"
              theme="dark"
              toastOptions={{
                style: {
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-dm-sans)',
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
