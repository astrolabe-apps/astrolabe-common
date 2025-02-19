import { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
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
        secondary: {
          50: "#E8EFF7",
          100: "#D1E0F0",
          200: "#A7C3E2",
          300: "#79A4D2",
          400: "#4F88C4",
          500: "#3669A1",
          600: "#2C5582",
          700: "#203F5F",
          800: "#162B41",
          900: "#0A141F",
          950: "#050A0F",
          DEFAULT: "#3669A1",
        },
        surface: colors.gray,
        primaryText: colors.white,
        primaryLight: "#098851",
        dark: {
          DEFAULT: "#404041",
          light: "#4F4F4F",
          text: colors.white,
          darker: "#333333",
        },
        danger: colors.red,
        error: {
          DEFAULT: colors.red["500"],
          light: colors.red["100"],
        },
      },
    },
  },
  plugins: [],
} as Config;
