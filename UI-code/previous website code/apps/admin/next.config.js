// filepath: apps/admin/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@automotive/ui'],
  // Allow server components to import specific external packages
  experimental: {
    serverComponentsExternalPackages: ['@automotive/database'],
  },

  // Image domains - Allow any external images for placeholder phase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },

  // Avoid static redirects that interfere with auth-based routing.
  // The app-level pages guard access and handle navigation.

  // Security headers for admin panel
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

