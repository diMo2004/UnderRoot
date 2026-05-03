const path = require('path');

/** @type {import('next').NextConfig} */
console.log('--- Loading next.config.js ---');
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
