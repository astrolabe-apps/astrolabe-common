import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import istanbul from "vite-plugin-istanbul";
export default defineConfig({
  optimizeDeps: {
    include: ["@astroapps/schemas-datagrid", "@astroapps/schemas-editor"],
    force: true,
  },
  build: {
    commonjsOptions: {
      // include: /schemas-.+/,
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ["module:@react-typed-forms/transform"],
      },
    }),
    istanbul({
      cwd: "../../../..",
      include: ["schemas/**", "**/ClientApp/**"],
    }),
    svgr({
      svgrOptions: {
        exportType: "default",
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: "**/*.svg",
    }),
  ],
});
