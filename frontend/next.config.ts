/// <reference path="./next-pwa.d.ts" />
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export for File Manager (shared hosting)
  typescript: {
    ignoreBuildErrors: true, // Skip TypeScript errors for build
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.jabilinventory.store',
        pathname: '/**',
      },
    ],
  },
  // Disable prefetching for all links to prevent prefetch issues
  experimental: {
    optimizePackageImports: [],
  },
  // Turbopack configuration (empty config to silence warning)
  turbopack: {},
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
