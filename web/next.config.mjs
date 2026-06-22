/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the file-tracing root to this app (multiple lockfiles exist in the monorepo).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
