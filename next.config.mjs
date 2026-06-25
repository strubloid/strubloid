import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  sassOptions: {
    includePaths: [path.join(import.meta.dirname, 'src/styles')],
  },
};

export default nextConfig;
