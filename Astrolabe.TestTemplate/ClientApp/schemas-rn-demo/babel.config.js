const path = require("path");

// Anchor the exclude to the Rush pnpm store: minimatch's "**" won't cross dot-directories,
// so "**/.pnpm/**" fails to match when the checkout itself lives under one (e.g. .claude/worktrees).
const pnpmStore = path.resolve(__dirname, "../../common/temp/node_modules/.pnpm");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      [
        "module:@react-typed-forms/transform",
        {
          exclude: [`${pnpmStore}/**`],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
