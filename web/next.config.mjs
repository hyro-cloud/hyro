/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  async redirects() {
    return [{ source: '/base', destination: '/b20', permanent: true }];
  },
};

export default nextConfig;
