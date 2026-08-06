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
 */
const workspaceCjs = {
  "^@react-typed-forms/core$":
    "<rootDir>/node_modules/@react-typed-forms/core/lib/index.cjs",
  "^@astroapps/controls$":
    "<rootDir>/node_modules/@react-typed-forms/core/node_modules/@astroapps/controls/lib/index.cjs",
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
  },
  moduleNameMapper: workspaceCjs,
};
