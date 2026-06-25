/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  },
  sassOptions: {
    includePaths: ['./src/styles'],
  },
};

export default nextConfig;
