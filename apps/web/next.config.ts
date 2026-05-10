import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // AWS S3 ap-southeast-1 (Singapore — closest to Sri Lanka)
      {
        protocol: 'https',
        hostname: '*.s3.ap-southeast-1.amazonaws.com',
        pathname: '/**',
      },
      // CloudFront CDN
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
      // Local dev (MailHog / placeholder images)
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Unsplash (for dev placeholders)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Experimental
  experimental: {
    // Partial Pre-rendering for product pages
    ppr: false,
    typedRoutes: true,
  },

  // Redirect /shop → /
  async redirects() {
    return [
      { source: '/shop', destination: '/', permanent: true },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
