/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
