import type { Config } from "tailwindcss";
import * as ti from "./tail.include";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/@react-typed-forms/schemas/lib/*.js",
    "node_modules/@astroapps/schemas-editor/lib/*.js",
    "./**/node_modules/@astroapps/ui-tree/*.js",
    "node_modules/@astroapps/aria-datepicker/lib/*.js",
    "node_modules/@astroapps/aria-base/lib/*.js",
    "node_modules/@astrolabe/ui/**/*.tsx",
    "node_modules/@astroapps/schemas-datepicker/lib/*.js",
  ],
  presets: [ti],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
