import { Config } from "tailwindcss";
import { blue } from "tailwindcss/colors";
export default {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@react-typed-forms/schemas-html/lib/index.js",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: blue,
      },
    },
  },
  plugins: [],
} as Config;
