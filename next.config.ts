import type {NextConfig} from 'next';
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  disable: process.env.NODE_ENV === 'development',
});


const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['react-i18next'],
  // Required for Next.js 16 with webpack plugins (like next-pwa)
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  allowedDevOrigins: [
    '*.run.app',
    '*.us-west2.run.app',
    'ais-dev-bdislxxyovvumvun56bapj-675664137550.us-west2.run.app',
    'ais-pre-bdislxxyovvumvun56bapj-675664137550.us-west2.run.app',
    'localhost',
    '127.0.0.1',
  ],
};

export default withPWA(nextConfig);
