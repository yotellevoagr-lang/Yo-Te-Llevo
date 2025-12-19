
import type {NextConfig} from 'next';
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline', // Fallback for document pages
  },
  disable: process.env.NODE_ENV === 'development',
});


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
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
    'worf.replit.dev',
    'kirk.replit.dev',
    'picard.replit.dev', 
    'spock.replit.dev',
    'repl.co',
    'replit.dev',
    process.env.REPLIT_DEV_DOMAIN || ''
  ].filter(Boolean),
};

export default withPWA(nextConfig);
