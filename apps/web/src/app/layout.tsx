import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'MarkComm — Sri Lanka\'s Multi-Vendor Marketplace',
    template: '%s | MarkComm',
  },
  description: 'Shop thousands of products from verified Sri Lankan vendors. Fast delivery island-wide.',
  keywords: ['sri lanka', 'online shopping', 'multi-vendor', 'marketplace', 'fashion', 'electronics'],
  authors: [{ name: 'Mark & Comm (Pvt) Ltd' }],
  openGraph: { type: 'website', locale: 'en_LK', siteName: 'MarkComm' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-zinc-50 min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
