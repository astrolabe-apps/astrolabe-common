/**
 * Standalone profiling script for createFormStateNode.
 *
 * Usage:
 *   cd forms/core
 *   npx tsx test/profile-formstate.ts              # Quick timing
 *   node --cpu-prof --import tsx/esm test/profile-formstate.ts  # CPU profile
 */
import { readFileSync } from "fs";
import { performance } from "perf_hooks";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import {
  ControlDefinition,
  createFormTree,
  createSchemaLookup,
  createSchemaDataNode,
  createFormStateNode,
  defaultResolveChildNodes,
  defaultSchemaInterface,
  defaultEvaluators,
  SchemaField,
} from "../src";
import { newControl } from "@astroapps/controls";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Load the real ControlDefinitionSchemaMap (dumped from astrolabe-schemas-editor)
// ---------------------------------------------------------------------------

const schemaMap: Record<string, SchemaField[]> = JSON.parse(
  readFileSync(resolve(__dirname, "ControlDefinitionSchemaMap.json"), "utf-8"),
);

// ---------------------------------------------------------------------------
// 2. Load the 124 editor control definitions from JSON
// ---------------------------------------------------------------------------
const jsonPath = resolve(
  __dirname,
  "../../../astrolabe-schemas-editor/src/ControlDefinition.json",
);
const controls: ControlDefinition[] = JSON.parse(
  readFileSync(jsonPath, "utf-8"),
);

function countControls(c: ControlDefinition[]): number {
  return c.reduce(
    (n, x) => n + 1 + countControls((x as any).children ?? []),
    0,
  );
}
console.log(
  `Loaded ${countControls(controls)} controls (${controls.length} top-level) from JSON`,
);

// ---------------------------------------------------------------------------
// 3. Build the form tree and schema data node
// ---------------------------------------------------------------------------

const schemaLookup = createSchemaLookup(schemaMap);
const schemaTree = schemaLookup.getSchemaTree("ControlDefinition");

// ---------------------------------------------------------------------------
// 4. Helper: count all nodes in a FormStateNode tree
// ---------------------------------------------------------------------------

function allChildren(node: { children: any[] }): any[] {
  return [node, ...node.children.flatMap((c: any) => allChildren(c))];
}

// ---------------------------------------------------------------------------
// 5. Run createFormStateNode and measure timing
// ---------------------------------------------------------------------------

const ITERATIONS = 5;

function runOnce() {
  const formTree = createFormTree(controls);
  const data = newControl({});
  const schemaDataNode = createSchemaDataNode(schemaTree.rootNode, data);
  const formState = createFormStateNode(
    formTree.rootNode,
    schemaDataNode,
    {
      schemaInterface: defaultSchemaInterface,
      clearHidden: false,
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
    },
    {},
  );
  return formState;
}

// Warmup run
console.log("\n--- Warmup ---");
const warmupStart = performance.now();
const warmupResult = runOnce();
const warmupTime = performance.now() - warmupStart;
const warmupNodes = allChildren(warmupResult);
console.log(
  `Warmup: ${warmupTime.toFixed(2)}ms, ${warmupNodes.length} total nodes`,
);
warmupResult.cleanup();

// Measured runs
console.log(`\n--- ${ITERATIONS} measured runs ---`);
const times: number[] = [];
let lastNodeCount = 0;

for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  const result = runOnce();
  const elapsed = performance.now() - start;
  times.push(elapsed);
  lastNodeCount = allChildren(result).length;
  console.log(`  Run ${i + 1}: ${elapsed.toFixed(2)}ms`);
  result.cleanup();
}

// Summary
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);
console.log(`\n--- Summary ---`);
console.log(`  Avg: ${avg.toFixed(2)}ms`);
console.log(`  Min: ${min.toFixed(2)}ms`);
console.log(`  Max: ${max.toFixed(2)}ms`);
console.log(`  Nodes: ${lastNodeCount}`);
console.log(`  Time/node: ${(avg / lastNodeCount).toFixed(3)}ms`);
