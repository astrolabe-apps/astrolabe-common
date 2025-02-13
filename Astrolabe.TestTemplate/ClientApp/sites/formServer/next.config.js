/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  experimental: {
    swcPlugins: [["@astroapps/swc-controls-plugin", {}]],
  },
};

module.exports = nextConfig;
