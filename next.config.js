/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  experimental: { isrFlushToDisk: false, },
}

module.exports = nextConfig
