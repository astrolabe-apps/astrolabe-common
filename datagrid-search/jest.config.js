/** @type {import('ts-jest').JestConfigWithTsJest} **/

/**
 * The workspace packages publish an `exports` map whose only conditions are
 * `types` and `default`, and `default` is the ESM build. Jest runs CJS here, so
 * it resolves `default`, hits an `import` statement inside `node_modules` (which
 * transformers skip by default) and dies. There is no `require` condition to
 * select, so `customExportConditions` can't fix it — map the specifiers straight
 * onto the CJS builds instead.
 *
 * These are the runtime imports only. Type-only imports (`SearchOptions`,
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

export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  moduleNameMapper: workspaceCjs,
};
