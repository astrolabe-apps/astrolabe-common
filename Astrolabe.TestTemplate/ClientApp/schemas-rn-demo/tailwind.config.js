/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", 
      "./node_modules/@react-typed-forms/schemas-rn/lib/index.js"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
        colors: {
        primary: {
          "DEFAULT": "#098851",
          "50": "#f0f9f4",
          "100": "#dbf0e3",
          "200": "#b9e1cb",
          "300": "#8acbaa",
          "400": "#59ae86",
          "500": "#37926a",
          "600": "#256f50",
          "700": "#1f5d44",
        }
        }
    },
  },
  plugins: [],
}