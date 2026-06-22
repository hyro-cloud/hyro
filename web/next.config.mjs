/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  // Self-contained server build for Docker/VPS hosting (ignored by Vercel).
  output: 'standalone',
  async redirects() {
    return [{ source: '/base', destination: '/b20', permanent: true }];
  },
};

export default nextConfig;
