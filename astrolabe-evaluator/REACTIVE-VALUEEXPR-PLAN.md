# Reactive ValueExpr Implementation Plan

## Overview

Introduce reactive ValueExpr capabilities with two implementations:
1. **ComputedValueExpr** - For computed/derived values using compute functions
2. **ControlBackedValueExpr** - Wraps existing `Control<any>` and shapes it as `ValueExprValue` reactively

Both implementations are drop-in replacements for plain ValueExpr objects (POJOs), requiring no breaking API changes.

---

## Implementation Steps

### 1. Extract ValueExprValue Type

**File**: `src/ast.ts`

**Changes:**
```typescript
// NEW: Named type for ValueExpr.value
export type ValueExprValue =
  | string
  | number
  | boolean
  | Record<string, ValueExpr>
  | ValueExpr[]
  | null
  | undefined;

// UPDATE: ValueExpr interface
export interface ValueExpr {
  type: "value";
  value?: ValueExprValue;  // Changed: Use named type instead of inline union
  function?: FunctionValue;
  path?: Path;
  deps?: Path[];
  location?: SourceLocation;
}
```

**Rationale:**
- Reusable type for compute function signatures
- Clear intent - "this is a value type"
- Makes interface more maintainable

---

### 2. Create ReactiveValueExpr Classes

**File**: `src/reactiveValueExpr.ts` (NEW)

```typescript
import { Control, newControl, updateComputedValue } from "@astrolabe-controls";
import type { ValueExpr, ValueExprValue, FunctionValue, Path, SourceLocation } from "./ast";
import { valueExpr } from "./ast";

// Base class for reactive implementations
abstract class ReactiveValueExprBase implements ValueExpr {
  readonly type = "value" as const;

  abstract get value(): ValueExprValue;

  constructor(
    public path?: Path,
    public location?: SourceLocation,
    public function?: FunctionValue,
    public deps?: Path[]
  ) {}

  static isReactive(expr: ValueExpr): expr is ReactiveValueExprBase {
    return expr instanceof ReactiveValueExprBase;
  }
}

// 1. Computed reactive values (from compute function)
export class ComputedValueExpr extends ReactiveValueExprBase {
  private _control: Control<ValueExprValue>;

  get value(): ValueExprValue {
    return this._control.value;
  }

  constructor(
    control: Control<ValueExprValue>,
    path?: Path,
    location?: SourceLocation,
    function?: FunctionValue,
    deps?: Path[]
  ) {
    super(path, location, function, deps);
    this._control = control;
  }

  getControl(): Control<ValueExprValue> {
    return this._control;
  }
}

// 2. Control-backed reactive values (wraps existing Control<any>)
export class ControlBackedValueExpr extends ReactiveValueExprBase {
  private _control: Control<any>;

  get value(): ValueExprValue {
    const rawValue = this._control.value; // Reactive access!
    return shapeAsValueExprValue(rawValue, this.path);
  }

  constructor(
    control: Control<any>,
    path?: Path,
    location?: SourceLocation,
    function?: FunctionValue,
    deps?: Path[]
  ) {
    super(path, location, function, deps);
    this._control = control;
  }

  getControl(): Control<any> {
    return this._control;
  }
}

// Helper: Convert raw value to ValueExprValue shape
function shapeAsValueExprValue(raw: any, path?: Path): ValueExprValue {
  // Primitives and null/undefined pass through
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }

  // Arrays - recursively wrap elements as ValueExpr
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      const itemPath = path ? { segment: String(idx), parent: path } : undefined;
      const shapedItem = shapeAsValueExprValue(item, itemPath);
      return valueExpr(shapedItem, itemPath);
    });
  }

  // Objects - recursively wrap properties as ValueExpr
  if (typeof raw === 'object') {
    const shaped: Record<string, ValueExpr> = {};
    for (const key in raw) {
      const propPath = path ? { segment: key, parent: path } : undefined;
      const shapedValue = shapeAsValueExprValue(raw[key], propPath);
      shaped[key] = valueExpr(shapedValue, propPath);
    }
    return shaped;
  }

  // Fallback for unknown types
  return raw;
}

// Factory: Create computed reactive value
export function computeValueExpr(
  computeFn: () => ValueExprValue,
  path?: Path,
  location?: SourceLocation
): ValueExpr {
  const control = newControl<ValueExprValue>(null);
  updateComputedValue(control, computeFn);
  return new ComputedValueExpr(control, path, location);
}

// Factory: Wrap existing Control as reactive ValueExpr
export function controlValueExpr(
  control: Control<any>,
  path?: Path,
  location?: SourceLocation
): ValueExpr {
  return new ControlBackedValueExpr(control, path, location);
}

// Re-export base for type checking
export { ReactiveValueExprBase };
```

**Key Points:**

- **ReactiveValueExprBase**: Abstract base class implementing `ValueExpr` interface
- **ComputedValueExpr**: For computed values created via `computeValueExpr(computeFn)`
- **ControlBackedValueExpr**: Wraps external `Control<any>` and shapes on-demand via getter
- **shapeAsValueExprValue()**: Converts raw values to `ValueExprValue` format recursively
  - Objects → `Record<string, ValueExpr>` (properties wrapped)
  - Arrays → `ValueExpr[]` (elements wrapped)
  - Primitives → pass through
- **Factory functions**: Clean API for creating reactive instances

---

### 3. Add `computeValueExpr()` Method to EvalEnv

**Key Design Decision**: Make `computeValueExpr()` an abstract method on `EvalEnv`. This eliminates conditional logic in functions - the environment decides reactivity strategy.

**File**: `src/ast.ts`

```typescript
export abstract class EvalEnv {
  // ... existing abstract properties ...

  // NEW: Environment-specific computation strategy
  abstract computeValueExpr(
    computeFn: () => ValueExprValue,
    path?: Path,
    location?: SourceLocation
  ): ValueExpr;

  // ... rest of class ...
}
```

**File**: `src/evaluate.ts` - BasicEvalEnv Implementation

```typescript
export class BasicEvalEnv extends EvalEnv {
  // ... existing methods ...

  // Static evaluation: Execute computation immediately, return POJO
  computeValueExpr(
    computeFn: () => ValueExprValue,
    path?: Path,
    location?: SourceLocation
  ): ValueExpr {
    const result = computeFn();  // Execute immediately
    return { type: "value", value: result, path, location };
  }
}
```

**File**: `src/reactiveEvaluate.ts` (NEW) - ReactiveEvalEnv Implementation

```typescript
import { Control, newControl, updateComputedValue } from "@astrolabe-controls";
import { BasicEvalEnv } from "./evaluate";
import { computeValueExpr as makeComputedValueExpr, controlValueExpr } from "./reactiveValueExpr";
import { EvalEnvState, emptyEnvState } from "./ast";

export class ReactiveEvalEnv extends BasicEvalEnv {
  // Reactive evaluation: Create ComputedValueExpr
  computeValueExpr(
    computeFn: () => ValueExprValue,
    path?: Path,
    location?: SourceLocation
  ): ValueExpr {
    return makeComputedValueExpr(computeFn, path, location);
  }
}

// Helper: Create reactive environment from Control data
export function reactiveEnvState(dataControl: Control<any>): EvalEnvState {
  const reactiveData = controlValueExpr(dataControl);
  return {
    ...emptyEnvState(dataControl.value),
    data: {
      root: reactiveData,
      getProperty(parent, property) {
        // Use controlValueExpr to wrap property access reactively
        const parentValue = parent.value;
        // ... implementation similar to emptyEnvState but preserving reactivity
      }
    },
    current: reactiveData
  };
}
```

**Usage Example:**
```typescript
// Static evaluation
const env = new BasicEvalEnv(emptyEnvState(data));

// Reactive evaluation
const dataControl = newControl(data);
const env = new ReactiveEvalEnv(reactiveEnvState(dataControl));
```

**Benefits of this approach:**
- ✅ **Zero conditional logic in functions** - Functions just call `env.computeValueExpr()`
- ✅ **Clean separation** - Environment controls reactivity strategy
- ✅ **No performance overhead** - Static evaluation is fast (immediate execution)
- ✅ **Follows existing pattern** - EvalEnv already uses abstract methods for strategy
- ✅ **Simple function updates** - Just wrap computation in `env.computeValueExpr(() => ...)`

---

### 4. Create Helper Functions

**File**: `src/valueExprHelpers.ts` (NEW)

```typescript
import {
  ReactiveValueExprBase,
  ComputedValueExpr,
  ControlBackedValueExpr
} from "./reactiveValueExpr";
import type { ValueExpr, ValueExprValue, Path } from "./ast";

// Generic update function - preserves reactivity
export function updateValueExpr(
  expr: ValueExpr,
  updates: Partial<Omit<ValueExpr, 'type'>>
): ValueExpr {
  if (expr instanceof ComputedValueExpr) {
    // Preserve computed reactive instance with updated properties
    const control = expr.getControl();
    return new ComputedValueExpr(
      control,
      updates.path ?? expr.path,
      updates.location ?? expr.location,
      updates.function ?? expr.function,
      updates.deps ?? expr.deps
    );
  }
  if (expr instanceof ControlBackedValueExpr) {
    // Preserve control-backed reactive instance
    const control = expr.getControl();
    return new ControlBackedValueExpr(
      control,
      updates.path ?? expr.path,
      updates.location ?? expr.location,
      updates.function ?? expr.function,
      updates.deps ?? expr.deps
    );
  }
  // Plain POJO - use spread
  return { ...expr, ...updates };
}

// Update dependencies - preserves reactivity
export function withDeps(expr: ValueExpr, deps: Path[] | undefined): ValueExpr {
  return updateValueExpr(expr, { deps });
}

// Update path - preserves reactivity
export function withPath(expr: ValueExpr, path: Path | undefined): ValueExpr {
  return updateValueExpr(expr, { path });
}

// Replace value - ALWAYS returns POJO (setting static value breaks reactivity)
export function withValue(expr: ValueExpr, value: ValueExprValue): ValueExpr {
  return {
    type: "value",
    value,  // New static value
    path: expr.path,
    location: expr.location,
    function: expr.function,
    deps: expr.deps
  };
}

// Update path and deps together - preserves reactivity
export function withPathAndDeps(
  expr: ValueExpr,
  path: Path | undefined,
  deps: Path[] | undefined
): ValueExpr {
  return updateValueExpr(expr, { path, deps });
}
```

**Helper Function Behavior:**

| Function | Input: POJO | Input: Reactive | Output |
|----------|-------------|-----------------|--------|
| `updateValueExpr()` | Returns new POJO | Returns new reactive with updated metadata | Preserves type |
| `withDeps()` | Returns new POJO | Returns new reactive with updated deps | Preserves type |
| `withPath()` | Returns new POJO | Returns new reactive with updated path | Preserves type |
| `withValue()` | Returns new POJO | **Returns POJO** | Always POJO |
| `withPathAndDeps()` | Returns new POJO | Returns new reactive | Preserves type |

**Why does `withValue` always return POJO?**
Setting a static value inherently breaks reactivity. A reactive value gets its value from a computation or Control, not static assignment.

---

### 4. Replace Spread Operations

#### File: `src/values.ts`

**Line 28:**
```typescript
// OLD:
return { ...valueExpr, deps: combinedDeps };

// NEW:
return withDeps(valueExpr, combinedDeps);
```

**Line 35:**
```typescript
// OLD:
return { ...valueExpr, value: newElements, deps: combinedDeps };

// NEW:
return updateValueExpr(valueExpr, { value: newElements, deps: combinedDeps });
```

**Add imports:**
```typescript
import { withDeps, updateValueExpr } from "./valueExprHelpers";
```

---

#### File: `src/defaultFunctions.ts`

**Line 219:**
```typescript
// OLD:
return [env, { ...leftVal, value: vals }];

// NEW:
return [env, withValue(leftVal, vals)];
```

**Line 240:**
```typescript
// OLD:
return [env, { ...leftVal, value: vals.flatMap(allElems) }];

// NEW:
return [env, withValue(leftVal, vals.flatMap(allElems))];
```

**Line 510:**
```typescript
// OLD:
return { ...elem, deps: combinedDeps };

// NEW:
return withDeps(elem, combinedDeps);
```

**Line 642:**
```typescript
// OLD:
return [env, { ...x[1], deps: combinedDeps }];

// NEW:
return [env, withDeps(x[1], combinedDeps)];
```

**IMPORTANT - Preserving Reactivity in Functions:**

The above changes (lines 219, 240, 510, 642) handle immediate spread operations, but **functions that compute values based on other ValueExpr should use `env.computeValueExpr()` instead of directly computing.**

**The environment decides reactivity strategy** - no conditional logic needed!

**General Pattern:**
```typescript
// OLD (direct computation):
const result = input1.value + input2.value;
return [env, withValue(container, result)];

// NEW (environment-controlled):
return [env, env.computeValueExpr(
  () => input1.value + input2.value,  // Computation function
  container.path,
  container.location
)];
```

**Specific Function Updates:**

**Map function (line ~219):**
```typescript
// OLD:
return [env, withValue(leftVal, vals)];

// NEW:
return [env, env.computeValueExpr(
  () => vals.map(v => v.value),
  leftVal.path,
  leftVal.location
)];
```

**Flatmap function (line ~240):**
```typescript
// OLD:
return [env, withValue(leftVal, vals.flatMap(allElems))];

// NEW:
return [env, env.computeValueExpr(
  () => vals.flatMap(v => {
    const arrVal = v.value;
    return Array.isArray(arrVal) ? arrVal : [];
  }).flatMap(allElems),
  leftVal.path,
  leftVal.location
)];
```

**Arithmetic example (+):**
```typescript
// NEW:
return [env, env.computeValueExpr(
  () => toNumber(left.value) + toNumber(right.value),
  left.path
)];
```

**Add imports:**
```typescript
import { withValue, withDeps } from "./valueExprHelpers";
// No need to import computeValueExpr or ReactiveValueExprBase!
```

**Functions that MUST use this pattern:**
- Arithmetic operations: `+`, `-`, `*`, `/`, `%`
- Comparison operations: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Array operations: `map`, `flatmap`, `filter`, `reduce`, `elem`
- String operations: `concat`, `substring`
- Logical operations: `and`, `or`, `not`
- Conditional: `if-then-else`, `??`

**Note:** This is a **comprehensive refactor** of all functions in `defaultFunctions.ts`. Each function that computes from ValueExpr inputs wraps its computation in `env.computeValueExpr()`.

**Key Benefits:**
- ✅ No conditional logic - environment decides strategy
- ✅ Simpler code - just wrap computation
- ✅ Zero performance overhead for static evaluation (BasicEvalEnv executes immediately)
- ✅ Automatic reactivity for ReactiveEvalEnv

---

#### File: `src/ast.ts`

**Line 467 (in `emptyEnvState` getProperty function):**
```typescript
// OLD:
const result: ValueExpr = {
  ...propValue,
  path: propPath,
  deps: combinedDeps.length > 0 ? combinedDeps : undefined
};

// NEW:
const result: ValueExpr = withPathAndDeps(
  propValue,
  propPath,
  combinedDeps.length > 0 ? combinedDeps : undefined
);
```

**Add imports:**
```typescript
import { withPathAndDeps } from "./valueExprHelpers";
```

---

### 5. Update Exports

**File**: `src/index.ts`

**Add exports:**
```typescript
export {
  ComputedValueExpr,
  ControlBackedValueExpr,
  ReactiveValueExprBase,
  computeValueExpr,
  controlValueExpr
} from "./reactiveValueExpr";

export {
  ReactiveEvalEnv,
  reactiveEnvState
} from "./reactiveEvaluate";

export {
  updateValueExpr,
  withDeps,
  withPath,
  withValue,
  withPathAndDeps
} from "./valueExprHelpers";

export type { ValueExprValue } from "./ast";
```

---

### 6. Testing Strategy

#### Existing Tests
- All existing tests should pass unchanged (plain POJOs still work)
- No modifications needed to existing test files

#### New Test Cases

**Test File**: `src/reactiveValueExpr.test.ts` (NEW)

```typescript
describe("ComputedValueExpr", () => {
  test("computed value updates reactively", () => {
    const control = newControl(10);
    const computed = computeValueExpr(() => control.value * 2);

    expect(computed.value).toBe(20);

    control.value = 15;
    expect(computed.value).toBe(30);
  });

  test("computed value tracks multiple dependencies", () => {
    const x = newControl(5);
    const y = newControl(10);
    const computed = computeValueExpr(() => x.value + y.value);

    expect(computed.value).toBe(15);

    x.value = 8;
    expect(computed.value).toBe(18);

    y.value = 20;
    expect(computed.value).toBe(28);
  });
});

describe("ControlBackedValueExpr", () => {
  test("wraps primitive control", () => {
    const control = newControl(42);
    const wrapped = controlValueExpr(control);

    expect(wrapped.value).toBe(42);

    control.value = 100;
    expect(wrapped.value).toBe(100);
  });

  test("shapes object control as Record<string, ValueExpr>", () => {
    const control = newControl({ x: 10, y: 20 });
    const wrapped = controlValueExpr(control);

    const shaped = wrapped.value as Record<string, ValueExpr>;
    expect(shaped.x.value).toBe(10);
    expect(shaped.y.value).toBe(20);

    control.value = { x: 30, y: 40 };
    const reshaped = wrapped.value as Record<string, ValueExpr>;
    expect(reshaped.x.value).toBe(30);
    expect(reshaped.y.value).toBe(40);
  });

  test("shapes array control as ValueExpr[]", () => {
    const control = newControl([1, 2, 3]);
    const wrapped = controlValueExpr(control);

    const shaped = wrapped.value as ValueExpr[];
    expect(shaped.length).toBe(3);
    expect(shaped[0].value).toBe(1);
    expect(shaped[2].value).toBe(3);

    control.value = [10, 20];
    const reshaped = wrapped.value as ValueExpr[];
    expect(reshaped.length).toBe(2);
    expect(reshaped[0].value).toBe(10);
  });
});

describe("Helper Functions", () => {
  test("withDeps preserves reactivity", () => {
    const control = newControl(42);
    const reactive = computeValueExpr(() => control.value);

    const withDeps = withDeps(reactive, [somePath]);
    expect(ReactiveValueExprBase.isReactive(withDeps)).toBe(true);

    control.value = 100;
    expect(withDeps.value).toBe(100); // Still reactive!
  });

  test("withValue always returns POJO", () => {
    const control = newControl(42);
    const reactive = computeValueExpr(() => control.value);

    const staticValue = withValue(reactive, 999);
    expect(ReactiveValueExprBase.isReactive(staticValue)).toBe(false);
    expect(staticValue.value).toBe(999);

    control.value = 100;
    expect(staticValue.value).toBe(999); // Not reactive anymore
  });

  test("updateValueExpr preserves type for both reactive classes", () => {
    // ComputedValueExpr
    const computed = computeValueExpr(() => 42);
    const updated1 = updateValueExpr(computed, { deps: [somePath] });
    expect(updated1 instanceof ComputedValueExpr).toBe(true);

    // ControlBackedValueExpr
    const control = newControl(100);
    const wrapped = controlValueExpr(control);
    const updated2 = updateValueExpr(wrapped, { deps: [somePath] });
    expect(updated2 instanceof ControlBackedValueExpr).toBe(true);
  });
});
```

---

## Files Summary

### New Files
1. `src/reactiveValueExpr.ts` - Reactive classes and factories (~180 lines)
2. `src/valueExprHelpers.ts` - Helper functions (~60 lines)
3. `src/reactiveEvaluate.ts` - ReactiveEvalEnv implementation (~40 lines)
4. `src/reactiveValueExpr.test.ts` - Test suite (optional, recommended)

### Modified Files
1. `src/ast.ts`
   - Add `ValueExprValue` type
   - Update `ValueExpr.value` to use named type
   - **Add `computeValueExpr()` abstract method to `EvalEnv`**
   - Replace spread at line 467
   - Add import for `withPathAndDeps`

2. `src/evaluate.ts`
   - **Implement `computeValueExpr()` in `BasicEvalEnv`** (immediate execution, returns POJO)

3. `src/values.ts`
   - Replace spreads at lines 28, 35
   - Add imports: `withDeps`, `updateValueExpr`

4. `src/defaultFunctions.ts` ⚠️ **MAJOR REFACTOR**
   - Replace spreads at lines 219, 240, 510, 642
   - **Update ALL functions** to use `env.computeValueExpr()` for computed values
   - Update: arithmetic, comparison, array, string, logical operations
   - Add imports: `withValue`, `withDeps`
   - **Est. ~30-50 function updates needed**

5. `src/index.ts`
   - Export reactive classes, factories, helpers
   - Export `ReactiveEvalEnv`, `reactiveEnvState`
   - Export `ValueExprValue` type

---

## Usage Examples

### Example 1: Computed Reactive Value

```typescript
import { computeValueExpr } from "@astrolabe-evaluator";
import { newControl } from "@astrolabe-controls";

const dataControl = newControl({ x: 10, y: 20 });

const computed = computeValueExpr(
  () => dataControl.value.x + dataControl.value.y
);

console.log(computed.value); // 30

dataControl.value = { x: 15, y: 20 };
console.log(computed.value); // 35 - automatically updated!
```

### Example 2: Control-Backed Reactive Value

```typescript
import { controlValueExpr } from "@astrolabe-evaluator";
import { newControl } from "@astrolabe-controls";

const dataControl = newControl({
  firstName: "John",
  lastName: "Doe"
});

const wrapped = controlValueExpr(dataControl);

console.log(wrapped.value);
// { firstName: ValueExpr, lastName: ValueExpr }
// Shaped as Record<string, ValueExpr>

dataControl.value = { firstName: "Jane", lastName: "Smith" };
// wrapped.value automatically re-shapes with new data!

const shaped = wrapped.value as Record<string, ValueExpr>;
console.log(shaped.firstName.value); // "Jane"
console.log(shaped.lastName.value); // "Smith"
```

### Example 3: Using ReactiveEvalEnv for Evaluation

```typescript
import { ReactiveEvalEnv, reactiveEnvState } from "@astrolabe-evaluator";
import { newControl } from "@astrolabe-controls";
import { parseEval } from "@astrolabe-evaluator";

// Create reactive data
const dataControl = newControl({ x: 10, y: 20 });

// Create reactive environment - simple!
const env = new ReactiveEvalEnv(reactiveEnvState(dataControl));

// Evaluate expression - result is reactive!
const expr = parseEval("x + y");
const [_, result] = env.evaluate(expr);

console.log(result.value); // 30

// Update data - result automatically updates!
dataControl.value = { x: 15, y: 25 };
console.log(result.value); // 40 - automatically recomputed!
```

### Example 4: Static vs Reactive Evaluation

```typescript
import { BasicEvalEnv, ReactiveEvalEnv, emptyEnvState, reactiveEnvState } from "@astrolabe-evaluator";
import { newControl } from "@astrolabe-controls";
import { parseEval } from "@astrolabe-evaluator";

const data = { x: 10, y: 20 };
const expr = parseEval("x + y");

// Static evaluation - fast, no reactivity
const staticEnv = new BasicEvalEnv(emptyEnvState(data));
const [_, staticResult] = staticEnv.evaluate(expr);
console.log(staticResult.value); // 30
// staticResult is a plain POJO - no reactivity

// Reactive evaluation - with reactivity
const dataControl = newControl(data);
const reactiveEnv = new ReactiveEvalEnv(reactiveEnvState(dataControl));
const [__, reactiveResult] = reactiveEnv.evaluate(expr);
console.log(reactiveResult.value); // 30
// reactiveResult updates when dataControl changes
```

---

## Key Design Decisions

### Why Two Reactive Classes?

**ComputedValueExpr:**
- For derived/computed values
- Created via `computeValueExpr(computeFn)`
- Value computed from function on each access
- Use case: Calculated values that depend on other reactive data

**ControlBackedValueExpr:**
- For wrapping external data sources
- Created via `controlValueExpr(control)`
- Shapes raw Control value as `ValueExprValue` on each access
- Use case: Integrating with @astrolabe-controls data structures

### Why Shape During Getter Access?

```typescript
get value(): ValueExprValue {
  const rawValue = this._control.value; // Reactive access triggers tracking!
  return shapeAsValueExprValue(rawValue, this.path);
}
```

- **Reactive tracking**: Accessing `_control.value` in getter ensures dependency tracking
- **On-demand shaping**: Value shaped fresh each time, no caching needed
- **Always current**: Reflects latest Control value automatically

### Why Does withValue Always Return POJO?

Setting a static value inherently breaks reactivity:
- Reactive values get their value from computations or Controls
- Static assignment means "no longer reactive"
- Simpler implementation - no need to check type or preserve Control
- Use cases (map, flatmap, toString) create new static values anyway

### Why Preserve Reactivity for Metadata Updates?

Operations like `withDeps` and `withPath` only update metadata:
- The underlying computation/Control doesn't change
- Value is still computed/shaped the same way
- Only the Control reference needs to be preserved in new instance

---

## Migration Notes

### For Existing Code

**No changes needed!** All existing code using plain ValueExpr POJOs continues to work:

```typescript
// This still works unchanged
const plain: ValueExpr = { type: "value", value: 42 };
const result = evaluate(someExpr, plain);
```

### For New Reactive Features

Opt-in to reactivity when needed:

```typescript
// Static evaluation (existing)
const result1 = evaluate(expr, { type: "value", value: data });

// Reactive evaluation (new)
const dataControl = newControl(data);
const reactiveData = controlValueExpr(dataControl);
const result2 = evaluate(expr, reactiveData);
// result2 updates when dataControl changes!
```

---

## Implementation Strategy

### EvalEnv-Based Approach (Clean Solution)

By making `computeValueExpr()` an abstract method on `EvalEnv`, we get the best of both worlds:

**Static Evaluation (BasicEvalEnv):**
```typescript
computeValueExpr(computeFn, path, location) {
  const result = computeFn();  // Execute immediately
  return { type: "value", value: result, path, location };  // Return POJO
}
```
- ✅ Zero overhead - immediate execution
- ✅ No Control creation
- ✅ Fast - just POJO allocation

**Reactive Evaluation (ReactiveEvalEnv):**
```typescript
computeValueExpr(computeFn, path, location) {
  return makeComputedValueExpr(computeFn, path, location);  // Return reactive
}
```
- ✅ Automatic dependency tracking
- ✅ Creates ComputedValueExpr with Control
- ✅ Updates when dependencies change

**Functions Don't Care:**
```typescript
// Same code works for both static and reactive:
return [env, env.computeValueExpr(() => left.value + right.value, left.path)];
```

**This eliminates the need for conditional logic completely!**

---

## Open Questions / Future Work

1. **Performance**: Should we cache shaped values in `ControlBackedValueExpr` to avoid re-shaping on every access?
   - Pro: Faster repeated access
   - Con: More complex, requires cache invalidation

2. **Cleanup**: Should we expose a cleanup/dispose method for reactive instances?
   - Controls created internally may need cleanup
   - Consider adding to factory return type

3. **Deep reactivity**: Should nested objects/arrays from `ControlBackedValueExpr` also be reactive?
   - Current: Only top-level is reactive
   - Future: Could wrap nested objects as reactive too

4. **Type guards**: Should we expose more type guards for distinguishing reactive types?
   ```typescript
   isComputedValueExpr(expr)
   isControlBackedValueExpr(expr)
   ```

---

## Success Criteria

✅ All existing tests pass without modification
✅ New reactive tests demonstrate both reactive classes work
✅ Helper functions preserve/break reactivity as documented
✅ No breaking changes to existing API
✅ Clean opt-in API for reactive features
✅ Documentation complete with usage examples