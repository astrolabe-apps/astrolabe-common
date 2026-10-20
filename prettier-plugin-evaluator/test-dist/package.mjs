// Loads the plugin the way an installed consumer does: by package name, through
// `exports`, with type stripping off (Node won't strip types under node_modules).
// Run with `rushx test:dist` after `rushx build`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { format } from "prettier";
import plugin from "@astroapps/prettier-plugin-evaluator";

test("formats an expression through the published entry point", async () => {
  const out = await format("$a+  1", {
    parser: "evaluator",
    plugins: [plugin],
  });
  assert.equal(out, "$a + 1\n");
});
