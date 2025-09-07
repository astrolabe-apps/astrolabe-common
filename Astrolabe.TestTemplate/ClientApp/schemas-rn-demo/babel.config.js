module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      [
        "module:@react-typed-forms/transform",
        {
          exclude: ["**/.pnpm/**"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};