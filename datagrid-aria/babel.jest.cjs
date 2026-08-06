/**
 * Babel, for tests only — the build doesn't use this file.
 *
 * `@react-typed-forms/transform` is what wraps a component in
 * `useComponentTracking` so reading `control.value` inside it is reactive. Without
 * it, any component that calls `useControl` throws "No active ComponentTracker"
 * the moment it renders — which is why the Fluent package's tests can't open its
 * filter popover, and say so in a comment.
 *
 * Running it here means the tests exercise components as they're actually built,
 * rather than a variant that only works because the test rendered it by hand.
 *
 * **Why babel does the whole job, rather than ts-jest with a babel pass after it.**
 * The transform finds components by their JSX and inserts an import, so it needs
 * ESM with the JSX still in it. ts-jest emits CommonJS whatever `module` says,
 * which babel's `sourceType: "unambiguous"` then reads as a script — and the
 * transform quietly does nothing at all. One babel pass over the original source
 * keeps the JSX and the ESM, so the plugin sees what it expects.
 *
 * The cost is that babel strips types without checking them, so `npm test` runs
 * `tsc --noEmit -p tsconfig.test.json` first to put that back. That step is also
 * what holds the build's end up: it checks JSX against the classic
 * `React.createElement` factory microbundle is given, and so still fails on a file
 * that forgets to import React — something the automatic runtime used here
 * wouldn't notice.
 *
 * `babelrc: false` because the package's own `.babelrc` lists the transform for
 * the build; picking both up would wrap every component twice.
 */
module.exports = {
  babelrc: false,
  configFile: false,
  presets: [
    // No `isTSX`/`allExtensions`: the filename extension tells it, and .ts files
    // here (styles.ts) aren't TSX.
    "@babel/preset-typescript",
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [
    "module:@react-typed-forms/transform",
    // Jest runs CommonJS. This has to come after the transform has had its look
    // at the ESM.
    "@babel/plugin-transform-modules-commonjs",
  ],
};
