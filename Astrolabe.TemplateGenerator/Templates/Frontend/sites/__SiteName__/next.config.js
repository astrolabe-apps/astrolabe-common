import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    swcPlugins: [["@astroapps/swc-controls-plugin", {}]],
  },
  transpilePackages: ["@astrolabe/ui", "@__AppName__/client-common", "@astroapps/client", "@astroapps/client-nextjs", "@astroapps/controls", "@astroapps/schemas-editor", "@astroapps/schemas-datepicker", "@astroapps/searchstate", "@astroapps/aria-datepicker"],
  turbopack: {
      root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;
