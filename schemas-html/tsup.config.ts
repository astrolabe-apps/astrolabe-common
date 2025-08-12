import { defineConfig } from "tsup";
import babel from "esbuild-plugin-babel";
export default defineConfig({
  esbuildPlugins: [babel()],
});
