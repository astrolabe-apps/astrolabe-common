import { Config } from "tailwindcss";
import { blue } from "tailwindcss/colors";
export default {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@react-typed-forms/schemas-html/lib/index.js",
    "./node_modules/@react-typed-forms/schemas-rn/lib/index.js",
    "./node_modules/@astroapps/schemas-editor/lib/index.js",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          "50": "#f0f9f4",
          "100": "#dbf0e3",
          "200": "#b9e1cb",
          "300": "#8acbaa",
          "400": "#59ae86",
          "500": "#37926a",
          "600": "#256f50",
          "700": "#1f5d44",
          "800": "#1b4a38",
          "900": "#173d2f",
          "950": "#0c221b",
          DEFAULT: "#267151",
        },
      },
    },
  },
  plugins: [],
} as Config;
