/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    swcPlugins: [["@astroapps/swc-controls-plugin", {}]],
  },
  transpilePackages: ["@astrolabe/ui", "@__AppName__/client-common"],
};

export default nextConfig;
