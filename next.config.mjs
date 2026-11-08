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
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
