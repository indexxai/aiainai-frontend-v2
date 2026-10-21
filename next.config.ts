import type { NextConfig } from 'next';

/** Where the NestJS API runs. The browser only ever talks to this app; /api is forwarded server-side. */
const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default config;
