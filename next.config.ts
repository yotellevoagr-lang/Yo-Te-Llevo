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
    '4037448f-bf7c-4193-a086-7712433a96e0-00-cpu7smc8rxb4.worf.replit.dev',
    'worf.replit.dev',
    'kirk.replit.dev',
    'picard.replit.dev', 
    'spock.replit.dev',
    'repl.co',
    'replit.dev',
    'localhost',
    '127.0.0.1',
  ],
};

export default withPWA(nextConfig);
