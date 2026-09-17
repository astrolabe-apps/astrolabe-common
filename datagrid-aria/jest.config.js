/** @type {import('ts-jest').JestConfigWithTsJest} **/

/**
 * The workspace packages publish an `exports` map whose only conditions are
 * `types` and `default`, and `default` is the ESM build. Jest runs CJS here, so
 * it resolves `default`, hits an `import` statement inside `node_modules` (which
 * transformers skip by default) and dies. There is no `require` condition to
 * select, so `customExportConditions` can't fix it — map the specifiers straight
 * onto the CJS builds instead.
 *
 * These are the runtime imports only. Type-only imports (`SearchRequest`,
 * `ColumnDef`) are erased at compile time and never resolved.
 *
 * `@react-typed-forms/core` is not in here: v5 is ESM-only and publishes no
 * `lib/index.cjs` to map onto, so it is transformed instead — see
 * `transformIgnorePatterns` below.
 */
const workspaceCjs = {
  "^@astroapps/searchstate$":
    "<rootDir>/node_modules/@astroapps/searchstate/lib/index.cjs",
  "^@astroapps/datagrid$":
    "<rootDir>/node_modules/@astroapps/datagrid/lib/index.cjs",
};

// Passed as an object rather than a path: babel-jest hands its options straight
// to babel, which doesn't know what `<rootDir>` means. `createRequire` because
// this file is ESM (the package is `type: module`) and the babel config is not.
import { createRequire } from "node:module";
const babelConfig = createRequire(import.meta.url)("./babel.jest.cjs");

export default {
  testEnvironment: "jsdom",
  // React Aria's overlays need jsdom shims the Fluent renderer didn't.
  setupFiles: ["<rootDir>/jest.setup.js"],
  transform: {
    // babel rather than ts-jest, so the control-tracking transform sees the JSX
    // and ESM it needs — see babel.jest.cjs. Types are checked by `tsc --noEmit`,
    // not by the test run.
    "^.+.tsx?$": ["babel-jest", babelConfig],
    // `@react-typed-forms/core` v5 and the `@rx-controls/*` engine beneath it
    // ship ESM only — v4 shipped dual (`lib/index.cjs` + a `require` export
    // condition). Jest runs CJS here, so those packages must be transformed
    // rather than passed through untouched. ts-jest can't do it (it only
    // handles the project's own TS), hence babel-jest for the `.js` in
    // node_modules.
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
  moduleNameMapper: workspaceCjs,
};
