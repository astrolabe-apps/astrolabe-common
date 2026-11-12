import path from "path";
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs",
    // Storybook 7 only picks the createRoot renderer when react-dom's version
    // starts with "18"; the repo pins react-dom 19, so force it explicitly.
    options: { legacyRootApi: false },
  },
  docs: {
    autodocs: true,
  },
  // Mirror the tsconfig "paths" aliases. @storybook/nextjs only applies tsconfig
  // paths when "baseUrl" is set, which TypeScript 6 deprecates.
  webpackFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@astrolabe/ui": path.resolve(__dirname, "../../astrolabe-ui/src"),
      "@": path.resolve(__dirname, "../src"),
    };
    return config;
  },
};
export default config;
