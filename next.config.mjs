/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["127.0.0.1", "localhost"],
  },
  reactStrictMode : false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://pericon-api-production.up.railway.app/api/:path*',
      },
      {
        source: '/hub/:path*',
        destination: 'https://pericon-api-production.up.railway.app/hub/:path*',
      },
    ];
  },
};

export default nextConfig;
