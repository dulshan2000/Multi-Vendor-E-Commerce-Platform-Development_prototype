import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MarkComm — Sri Lanka\'s Premium Multi-Vendor Fashion Marketplace',
    template: '%s | MarkComm',
  },
  description:
    'Shop the finest clothing from top Sri Lankan fashion vendors. Discover unique styles, exclusive brands, and fast delivery island-wide.',
  keywords: ['fashion', 'clothing', 'sri lanka', 'online shopping', 'multi-vendor', 'marketplace'],
  authors: [{ name: 'Mark & Comm (Pvt) Ltd' }],
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    url: process.env['NEXT_PUBLIC_APP_URL'],
    siteName: 'MarkComm',
    title: 'MarkComm — Sri Lanka\'s Premium Multi-Vendor Fashion Marketplace',
    description: 'Shop the finest clothing from top Sri Lankan fashion vendors.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MarkComm — Sri Lanka Fashion Marketplace',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
