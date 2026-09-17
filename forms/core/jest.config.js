/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
    // `@react-typed-forms/core` v5 and the `@rx-controls/*` engine beneath it ship ESM
    // only — v4 shipped dual (`lib/index.cjs` + a `require` export condition).
    // Jest runs CJS here, so those packages must be transformed rather than
    // passed through untouched. ts-jest can't do it (it only handles the
    // project's own TS), hence babel-jest for the `.js` in node_modules.
    "^.+\\.jsx?$": [
      "babel-jest",
      { presets: [["@babel/preset-env", { targets: { node: "current" } }]] },
    ],
  },
  // Anchored on the whole path rather than one `/node_modules/` segment: pnpm
  // stores the real files under `.pnpm/<name>@<version>/node_modules/<name>`, so
  // a per-segment pattern matches at the `.pnpm` segment and ignores them again.
  // This ignores a node_modules path only when neither package appears anywhere
  // in it, in either pnpm's `+` spelling or the plain `/` one.
  transformIgnorePatterns: [
    "node_modules/(?!.*(@react-typed-forms|@rx-controls)[+/])",
  ],
  preset: "ts-jest",
};
