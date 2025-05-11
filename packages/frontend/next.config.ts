import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // 백엔드 서버로 프록시
      },
    ];
  },
};

export default nextConfig;
