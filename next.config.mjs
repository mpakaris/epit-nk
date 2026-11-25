import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep @react-pdf/renderer out of the webpack bundle so its internal font
  // file references resolve correctly at runtime in prod.
  serverExternalPackages: ['@react-pdf/renderer', '@react-pdf/pdfkit', 'pdfkit'],

  // Tell Vercel's file-system tracer to include font files that @react-pdf/renderer
  // and pdfkit need at runtime but wouldn't otherwise detect as dependencies.
  outputFileTracingIncludes: {
    '**': [
      './public/fonts/*.ttf',
      './node_modules/pdfkit/js/standard-fonts/**',
      './node_modules/pdfkit/js/data/**',
    ],
  },

  // Cap upload request bodies at 25 MB (10 files × ~2.5 MB each after WebP compression)
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
  async headers() {
    return [
      {
        // Global security headers — applied to all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          // Allow payment API (needed when Creem checkout is embedded as iframe)
          { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(self), geolocation=(), payment=*' },
        ],
      },
      {
        // Allow our own pages to be embedded in iframes (checkout-popup-success must load inside the Creem iframe)
        // All other pages remain non-embeddable via CSP frame-ancestors
        source: '/checkout-popup-success',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
      {
        // All other pages: block being embedded in foreign iframes
        source: '/((?!checkout-popup-success).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
