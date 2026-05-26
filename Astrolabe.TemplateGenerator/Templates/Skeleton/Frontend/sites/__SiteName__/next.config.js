/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    swcPlugins: [["@astroapps/swc-controls-plugin", {}]],
    webpackBuildWorker: true,
  },
  transpilePackages: ["@astrolabe/ui", "client-common", "@astroapps/client", "@astroapps/client-nextjs", "@astroapps/controls", "@astroapps/schemas-editor", "@astroapps/schemas-datepicker", "@astroapps/searchstate", "@astroapps/aria-datepicker"],
  webpack: (config) => {
    config.resolve.symlinks = true;
    return config;
  },
};

export default nextConfig;
