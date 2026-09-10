/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
    // `@react-typed-forms/core` v5 and the `@rxc/*` engine beneath it ship ESM
    // only — v4 shipped dual (`lib/index.cjs` + a `require` export condition).
    // Jest runs CJS here, so those packages must be transformed rather than
    // passed through untouched. ts-jest can't do it (it only handles the
    // project's own TS), hence babel-jest for the `.js` in node_modules.
    "^.+\\.jsx?$": [
      "babel-jest",
      { presets: [["@babel/preset-env", { targets: { node: "current" } }]] },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(@react-typed-forms|@rxc)/)"],
  preset: "ts-jest",
};
