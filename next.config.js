/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { isrFlushToDisk: false, },
}

module.exports = nextConfig
