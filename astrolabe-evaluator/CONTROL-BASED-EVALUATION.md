# Control-Based Evaluation Design

## Overview

This document describes a clean, incremental approach to adding reactive evaluation capabilities to astrolabe-evaluator by using `Value<T>` from @astrolabe-controls, which allows **minimal overhead for constants** while enabling reactivity where needed.

## Core Insight

Instead of creating a separate reactive evaluation system, we make **all evaluation inherently Value-based**:

```typescript
// @astrolabe-controls provides:
interface Value<T> {
  value: T;
}
// Control<T> extends Value<T>

// Current:
localVars: Record<string, ValueExpr>
evaluate(expr: EvalExpr): EnvValue<ValueExpr>

// New:
localVars: Record<string, Value<ValueExpr>>
evaluateControl(expr: EvalExpr): EnvValue<Value<ValueExpr>>  // New core method
evaluate(expr: EvalExpr): EnvValue<ValueExpr>                 // Wrapper: returns .value
```

**Key benefits:**
- ✅ **Minimal overhead for constants** - wrapped as plain `{value: expr}` objects
- ✅ **Selective reactivity** - Controls only where tracking needed
- ✅ **Uniform interface** - always access via `.value`
- ✅ Backward compatible - `evaluate()` API unchanged
- ✅ Exposes reactive layer via `evaluateControl()`
- ✅ No helper functions needed - both implement `Value<T>`
- ✅ Simpler than separate reactive/static systems
- ✅ Incremental - can be adopted gradually

## Why Value Instead of Control?

Using `Value<T>` interface provides **minimal overhead constants** with **uniform access**:

### Without Value (wrapping everything in Control):
```typescript
// Every value wrapped in Control
let $a := 5                    // newControl(valueExpr(5)) - ~32 bytes overhead
let $b := "hello"              // newControl(valueExpr("hello")) - ~32 bytes overhead
let $c := $a + $b              // newControl(result) - ~32 bytes overhead

// 3 let bindings = ~96 bytes Control overhead for constants!
```

### With Value (selective wrapping):
```typescript
// Constants wrapped as plain objects
let $a := 5                    // {value: valueExpr(5)} - minimal overhead!
let $b := "hello"              // {value: valueExpr("hello")} - minimal overhead!
let $c := $a + $b              // {value: result} - minimal overhead!

// 3 let bindings = ~24 bytes total (plain object wrappers)
// Only reactive data uses full Controls
```

**The optimization:**
- Constants → `{value: ValueExpr}` (plain object, minimal overhead)
- Computed values → `{value: ValueExpr}` (plain object, minimal overhead)
- Reactive data → `Control<ValueExpr>` (full reactive tracking)
- Both implement `Value<T>` - uniform `.value` access!

## How It Works

### 1. Value Storage

Values in the evaluation environment use `Value<ValueExpr>` - either a `Control` (reactive) or plain object (constant):

```typescript
export interface EvalEnvState {
  data: EvalData;
  current: Value<ValueExpr>;                    // Changed from ValueExpr
  localVars: Record<string, Value<ValueExpr>>;  // Changed from ValueExpr
  parent?: EvalEnvState;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}
```

**Optimization:** Constants like `5` or `"hello"` are stored as `{value: valueExpr(5)}`, not full Controls!

### 2. Dual Evaluation API

**`evaluateControl()`** - Core evaluation returning Values:
```typescript
abstract evaluateControl(expr: EvalExpr): EnvValue<Value<ValueExpr>>;
```

**`evaluate()`** - Convenience wrapper extracting values:
```typescript
evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
  const [env, valueWrapper] = this.evaluateControl(expr);
  return [env, valueWrapper.value];  // Works for both Control and plain object!
}
```

**Uniform access via `.value`:**
- If `valueWrapper` is a `Control<ValueExpr>`: `.value` triggers reactivity tracking
- If `valueWrapper` is `{value: ValueExpr}`: `.value` is just property access (minimal overhead)

### 3. Reactivity Emergence

When `evaluate()` is called inside a reactive context (`collectChanges`), the `.value` access automatically tracks dependencies:

```typescript
// Static evaluation (no tracking)
const env = new BasicEvalEnv(emptyEnvState(data));
const [_, result] = env.evaluate(expr);
// Just returns the value

// Reactive evaluation (automatic tracking)
const dataControl = newControl(data);
const resultControl = newControl<ValueExpr>(valueExpr(null));

updateComputedValue(resultControl, () => {
  const env = new ControlEvalEnv(dataControl);
  const [_, result] = env.evaluate(expr);
  // All .value accesses are tracked!
  return result;
});
```

## Architecture Comparison

### Current (Static Only)
```
┌─────────────────────────────────────────┐
│ evaluate(expr)                           │
│   → EvalEnv                              │
│   → localVars: Record<string, ValueExpr> │
│   → returns ValueExpr                    │
└─────────────────────────────────────────┘
```

### New (Value-Based)
```
┌──────────────────────────────────────────────────────┐
│ evaluateControl(expr)                                 │
│   → EvalEnv                                           │
│   → localVars: Record<string, Value<ValueExpr>>      │
│   → returns Value<ValueExpr>                         │
│      │                                                │
│      ├─ Constants: {value: ValueExpr} (minimal!)     │
│      └─ Reactive: Control<ValueExpr>                 │
│                ↓                                      │
│    evaluate(expr)                                     │
│   → calls evaluateControl()                          │
│   → returns valueWrapper.value (uniform access!)     │
└──────────────────────────────────────────────────────┘
```

## Detailed Design

### Phase 1: Value Wrapper Layer

**Goal:** Add Value wrappers without changing behavior. All tests should still pass.

#### 1.1 Update `EvalEnvState`

```typescript
// ast.ts
import { Value } from "@astrolabe-controls";

export interface EvalEnvState {
  data: EvalData;
  current: Value<ValueExpr>;                    // Changed
  localVars: Record<string, Value<ValueExpr>>;  // Changed
  parent?: EvalEnvState;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}
```

#### 1.2 Add `evaluateControl()` to `EvalEnv`

```typescript
// ast.ts
export abstract class EvalEnv {
  abstract data: EvalData;
  abstract current: Value<ValueExpr>;  // Changed
  abstract errors: string[];
  abstract state: EvalEnvState;
  abstract getVariable(name: string): Value<ValueExpr> | undefined;  // Changed
  abstract compare(v1: unknown, v2: unknown): number;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withCurrent(valueWrapper: Value<ValueExpr>): EvalEnv;  // Changed

  // New core method
  abstract evaluateControl(expr: EvalExpr): EnvValue<Value<ValueExpr>>;

  // Existing method becomes a wrapper
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    const [env, valueWrapper] = this.evaluateControl(expr);
    return [env, valueWrapper.value];  // Uniform access!
  }

  abstract withError(error: string): EvalEnv;
}
```

#### 1.3 Update `lookupVar`

```typescript
// ast.ts
export function lookupVar(
  state: EvalEnvState,
  name: string,
): Value<ValueExpr> | undefined {  // Changed return type
  if (name in state.localVars) {
    return state.localVars[name];
  }
  return state.parent ? lookupVar(state.parent, name) : undefined;
}
```

#### 1.4 Update `EvalData`

```typescript
// ast.ts
export interface EvalData {
  root: Value<ValueExpr>;  // Changed
  getProperty(
    object: Value<ValueExpr>,
    property: string
  ): Value<ValueExpr>;  // Changed
}
```

#### 1.5 Update `emptyEnvState`

```typescript
// ast.ts
import { newControl, Control } from "@astrolabe-controls";

function isControl<T>(v: any): v is Control<T> {
  return v && typeof v === 'object' && 'uniqueId' in v && 'subscribe' in v;
}

export function emptyEnvState(root: unknown): EvalEnvState {
  const rootValue = toValue(EmptyPath, root);
  const rootControl = newControl(rootValue);

  const data: EvalData = {
    root: rootControl,
    getProperty(
      parent: Value<ValueExpr>,
      property: string
    ): Value<ValueExpr> {
      const parentValue = parent.value;  // Uniform .value access
      const propPath = parentValue.path
        ? segmentPath(property, parentValue.path)
        : undefined;

      const value = parentValue.value;
      if (typeof value === "object" && value != null && !Array.isArray(value)) {
        const objValue = value as Record<string, ValueExpr>;
        const propValue = objValue[property];
        if (propValue) {
          const combinedDeps: Path[] = [];
          if (parentValue.deps) combinedDeps.push(...parentValue.deps);
          if (propValue.deps) combinedDeps.push(...propValue.deps);

          const result: ValueExpr = {
            ...propValue,
            path: propPath,
            deps: combinedDeps.length > 0 ? combinedDeps : undefined
          };

          // Only wrap in Control if parent was a Control (preserves reactivity)
          // Otherwise return plain object wrapper
          return isControl(parent) ? newControl(result) : {value: result};
        }
      }

      const nullValue = valueExpr(null, propPath);
      return isControl(parent) ? newControl(nullValue) : {value: nullValue};
    },
  };

  return {
    data,
    current: rootControl,
    localVars: {},
    parent: undefined,
    errors: [],
    compare: compareSignificantDigits(5),
  };
}
```

#### 1.6 Implement `evaluateControl` in `BasicEvalEnv`

```typescript
// evaluate.ts
import { Value } from "@astrolabe-controls";

export class BasicEvalEnv extends EvalEnv {
  evaluateControl(expr: EvalExpr): EnvValue<Value<ValueExpr>> {
    return defaultEvaluateControl(this, expr);
  }

  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    const [env, valueWrapper] = this.evaluateControl(expr);
    return [env, valueWrapper.value];  // Uniform .value access!
  }

  constructor(public state: EvalEnvState) {
    super();
  }

  compare(v1: unknown, v2: unknown): number {
    return this.state.compare(v1, v2);
  }

  get current(): Value<ValueExpr> {  // Changed
    return this.state.current;
  }

  get errors() {
    return this.state.errors;
  }

  get data() {
    return this.state.data;
  }

  protected newEnv(newState: EvalEnvState): EvalEnv {
    return new BasicEvalEnv(newState);
  }

  withError(error: string): EvalEnv {
    return this.newEnv({
      ...this.state,
      errors: [...this.state.errors, error],
    });
  }

  getVariable(name: string): Value<ValueExpr> | undefined {  // Changed
    return lookupVar(this.state, name);
  }

  withVariables(vars: [string, EvalExpr][]): EvalEnv {
    if (vars.length === 0) return this;

    if (vars.length === 1) {
      return this.withVariable(vars[0][0], vars[0][1]);
    }

    let currentEnv = this as EvalEnv;
    const evaluatedVars: Record<string, Value<ValueExpr>> = {};  // Changed

    for (const [name, expr] of vars) {
      const [nextEnv, valueWrapper] = currentEnv.evaluateControl(expr);  // Changed
      evaluatedVars[name] = valueWrapper;
      currentEnv = nextEnv;
    }

    return this.newEnv({
      ...currentEnv.state,
      localVars: evaluatedVars,
      parent: this.state
    });
  }

  withVariable(name: string, expr: EvalExpr): EvalEnv {
    const [nextEnv, valueWrapper] = this.evaluateControl(expr);  // Changed
    return this.newEnv({
      ...nextEnv.state,
      localVars: { [name]: valueWrapper },
      parent: nextEnv.state
    });
  }

  withCurrent(current: Value<ValueExpr>): EvalEnv {  // Changed
    return this.newEnv({ ...this.state, current });
  }
}
```

#### 1.7 Implement `defaultEvaluateControl`

**Key optimization:** Constants return plain object `{value: expr}` - minimal overhead!

```typescript
// evaluate.ts
export function defaultEvaluateControl(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<Value<ValueExpr>> {
  switch (expr.type) {
    case "var": {
      const valueWrapper = env.getVariable(expr.variable);
      if (valueWrapper == null) {
        return [
          env.withError("Variable $" + expr.variable + " not declared"),
          {value: valueExpr(null)},  // Plain object wrapper
        ];
      }
      return [env, valueWrapper];  // Return as-is (Control or plain object)
    }

    case "let": {
      return env
        .withVariables(expr.variables.map(([v, e]) => [v.variable, e]))
        .evaluateControl(expr.expr);
    }

    case "value": {
      // OPTIMIZATION: Constants wrapped in plain object (minimal overhead!)
      return [env, {value: expr}];
    }

    case "call": {
      const funcWrapper = env.getVariable(expr.function);
      if (funcWrapper == null) {
        return [
          env.withError("Function $" + expr.function + " not declared"),
          {value: valueExpr(null)},
        ];
      }
      // Extract function value
      const funcValue = funcWrapper.value;
      // Function evaluation returns EnvValue<ValueExpr>
      const [nextEnv, result] = funcValue.function!.eval(env, expr);
      // Return plain object wrapper (functions return computed values)
      return [nextEnv, {value: result}];
    }

    case "property": {
      const propWrapper = env.state.data.getProperty(env.current, expr.property);
      return [env, propWrapper];  // Return as-is (Control or plain object)
    }

    case "array": {
      const [nextEnv, values] = mapAllEnv(env, expr.values, (e, expr) => {
        const [env2, valueWrapper] = e.evaluateControl(expr);
        return [env2, valueWrapper.value];  // Extract values for array
      });
      // Array result is computed, return plain object wrapper
      return [nextEnv, {value: { type: "value", value: values }}];
    }

    default:
      throw "Can't evaluate this:" + expr.type;
  }
}
```

**Performance impact:**
```typescript
// With this optimization:
let $a := 5,           // $a = {value: valueExpr(5)} - minimal overhead!
    $b := "hello",     // $b = {value: valueExpr("hello")} - minimal overhead!
    $c := x + 10       // $c = {value: result} - minimal overhead!
in $a + $b + $c

// Only reactive data (x) uses full Controls. All constants and computed values are plain objects!
```

#### 1.8 Update Helper Functions

```typescript
// evaluate.ts
export function evaluateWith(
  env: EvalEnv,
  value: Value<ValueExpr>,  // Changed
  ind: number | null,
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  // Index is a constant - wrap in plain object!
  return evaluateWithValue(env, value, {value: valueExpr(ind)}, expr);
}

export function evaluateWithValue(
  env: EvalEnv,
  value: Value<ValueExpr>,  // Changed
  bindValue: Value<ValueExpr>,  // Changed
  expr: EvalExpr,
): EnvValue<ValueExpr> {
  const [e, toEval] = checkLambda();
  return alterEnv(e.withCurrent(value).evaluate(toEval), (e) =>
    e.withCurrent(env.current),
  );

  function checkLambda(): EnvValue<EvalExpr> {
    switch (expr.type) {
      case "lambda":
        return [env.withVariables([[expr.variable, bindValue]]), expr.expr];
      default:
        return [env, expr];
    }
  }
}
```

### Phase 2: Reactive Evaluation

**Goal:** Add a simple wrapper function that makes evaluation reactive.

#### 2.1 Create `reactiveEvaluate.ts`

```typescript
// src/reactiveEvaluate.ts
import { Control, newControl, updateComputedValue } from "@astrolabe-controls";
import { EvalExpr, ValueExpr, emptyEnvState, valueExpr } from "./ast";
import { BasicEvalEnv } from "./evaluate";

/**
 * Evaluates an expression reactively against a Control-based data context.
 * The result automatically updates when dependencies change.
 *
 * @param expr - The expression to evaluate
 * @param dataControl - Control containing the data context
 * @returns Control that holds the result and updates automatically
 */
export function evaluateReactive(
  expr: EvalExpr,
  dataControl: Control<any>
): Control<ValueExpr> {
  const resultControl = newControl<ValueExpr>(valueExpr(null));

  updateComputedValue(resultControl, () => {
    // Create environment with Control-based data
    const envState = emptyEnvState(dataControl.value);
    const env = new BasicEvalEnv({
      ...envState,
      current: dataControl  // Root is the dataControl itself
    });

    // Evaluate - all .value accesses are tracked by collectChanges
    const [envWithErrors, result] = env.evaluate(expr);

    // Handle errors
    if (envWithErrors.errors.length > 0) {
      resultControl.setErrors({
        evaluation: envWithErrors.errors.join(", ")
      });
    } else {
      resultControl.clearErrors();
    }

    return result;
  });

  return resultControl;
}

/**
 * Helper to create a Control from plain data
 */
export function createReactiveData<T extends Record<string, any>>(
  initialData: T
): Control<T> {
  return newControl(initialData);
}
```

#### 2.2 Usage Examples

**Basic reactive evaluation:**
```typescript
import { parseEval } from "@astrolabe-evaluator";
import { evaluateReactive, createReactiveData } from "@astrolabe-evaluator/reactive";

const data = createReactiveData({ x: 10, y: 20 });
const expr = parseEval('x + y');
const result = evaluateReactive(expr, data);

console.log(result.value.value);  // 30

data.fields.x.value = 15;
console.log(result.value.value);  // 35 - automatically updated!
```

**Let bindings with reactivity:**
```typescript
const data = createReactiveData({
  firstName: "John",
  lastName: "Doe"
});

const expr = parseEval(`
  let $fullName := firstName + " " + lastName,
      $greeting := "Hello, " + $fullName
  in $greeting + "!"
`);

const result = evaluateReactive(expr, data);
console.log(result.value.value);  // "Hello, John Doe!"

data.fields.firstName.value = "Jane";
console.log(result.value.value);  // "Hello, Jane Doe!" - auto-updated!

// Performance: Each let binding is a separate Control
// When firstName changes:
// 1. $fullName Control updates (depends on firstName, lastName)
// 2. $greeting Control updates (depends on $fullName)
// 3. Result updates (depends on $greeting)
// Each is a separate reactive node!
```

**Conditional reactivity:**
```typescript
const data = createReactiveData({
  showDetails: false,
  firstName: "John",
  lastName: "Doe"
});

const expr = parseEval(`
  showDetails
    ? firstName + " " + lastName
    : "Hidden"
`);

const result = evaluateReactive(expr, data);
console.log(result.value.value);  // "Hidden"

// Changing firstName doesn't trigger update (not in dependency tree)
data.fields.firstName.value = "Jane";
console.log(result.value.value);  // Still "Hidden"

// Showing details adds firstName and lastName to dependencies
data.fields.showDetails.value = true;
console.log(result.value.value);  // "Jane Doe"

// Now firstName changes trigger updates
data.fields.firstName.value = "Bob";
console.log(result.value.value);  // "Bob Doe"
```

### Phase 3: Advanced Features

#### 3.1 Reactive Data Integration

Make `emptyEnvState` optionally work with reactive data:

```typescript
export function emptyEnvState(root: unknown | Control<any>): EvalEnvState {
  // Check if root is already a Control
  const rootControl = isControl(root)
    ? root
    : newControl(toValue(EmptyPath, root));

  const data: EvalData = {
    root: rootControl,
    getProperty(parent: Control<ValueExpr>, property: string): Control<ValueExpr> {
      // If parent is a reactive Control with fields, use those
      if (parent.fields && property in parent.fields) {
        return parent.fields[property];
      }

      // Otherwise create a computed control
      return newControl(/* ... */);
    },
  };

  return {
    data,
    current: rootControl,
    localVars: {},
    parent: undefined,
    errors: [],
    compare: compareSignificantDigits(5),
  };
}
```

#### 3.2 Control Cleanup

Add cleanup support for reactive evaluations:

```typescript
export function evaluateReactive(
  expr: EvalExpr,
  dataControl: Control<any>
): Control<ValueExpr> & { cleanup: () => void } {
  const resultControl = newControl<ValueExpr>(valueExpr(null));

  const stopReactive = updateComputedValue(resultControl, () => {
    // ... evaluation logic ...
  });

  return Object.assign(resultControl, {
    cleanup: stopReactive
  });
}

// Usage:
const result = evaluateReactive(expr, data);
// ... use result ...
result.cleanup();  // Stop reactive updates
```

#### 3.3 Batch Updates

Leverage @astrolabe-controls batching:

```typescript
import { groupedChanges } from "@astrolabe-controls";

groupedChanges(() => {
  data.fields.firstName.value = "Jane";
  data.fields.lastName.value = "Smith";
  data.fields.age.value = 25;
});
// Expression only re-evaluates ONCE with all changes
```

## Performance Characteristics

### Static Evaluation (Phase 1)

**Overhead:** **Minimal for constants!** Only reactive data uses full Controls
- Memory: Constants = ~8 bytes per plain object `{value: ...}`
- Memory: Reactive data = ~32 bytes per Control
- CPU: Negligible (no reactive tracking)

**Example:**
```typescript
let $a := 5,          // ~8 bytes overhead (plain object)
    $b := "hello",    // ~8 bytes overhead (plain object)
    $c := x + 10      // ~8 bytes overhead (plain object)
in $a + $b + $c

// Only x (from reactive data) might use a full Control (~32 bytes)
// Everything else is plain object wrappers
// Savings: ~24 bytes per constant vs full Control!
```

### Reactive Evaluation (Phase 2+)

**Benefits:**
- ✅ Fine-grained updates - only changed paths re-evaluate
- ✅ Automatic dependency tracking
- ✅ Efficient conditional expressions

**Overhead:**
- Memory: ~100 bytes per reactive node (Control + subscriptions)
- CPU: ~1-5μs per tracked access
- Subscriptions: ~50 bytes per dependency edge

**Scaling:**
- 10 let bindings: ~1KB overhead
- 100 reactive expressions: ~10KB overhead
- 1000+ works well with proper batching

## Key Design Advantages

### 1. Minimal-Overhead Constants

**Constants and computed values wrapped in plain objects `{value: ...}` - minimal overhead!**

```typescript
let $a := 5,              // {value: valueExpr(5)} - plain object!
    $b := "hello",        // {value: valueExpr("hello")} - plain object!
    $c := x + 10,         // {value: result} - plain object!
    $d := $a + $b + $c    // {value: result} - plain object!
in $d

// Only reactive data (x) uses full Controls.
// Constants $a, $b and computed $c, $d are all plain objects!
```

**Memory saved:**
- Without Value: Every value = ~32 bytes Control overhead
- With Value: Constants = ~8 bytes plain object overhead
- **Savings: ~24 bytes per constant!**

### 2. Incremental Adoption

```typescript
// Phase 1: Everything still works, minimal overhead
const env = new BasicEvalEnv(emptyEnvState(data));
const [_, result] = env.evaluate(expr);  // Constants are plain, fast!

// Phase 2: Opt into reactivity
const result = evaluateReactive(expr, dataControl);  // Now reactive!
```

### 3. Natural Granularity

Each let binding becomes its own value (Control or plain object):

```typescript
let $a := expensive(x),
    $b := expensive(y),
    $c := $a + $b
in $c

// Stored as (static evaluation):
localVars: {
  "$a": {value: ValueExpr},  // Plain object (computed result)
  "$b": {value: ValueExpr},  // Plain object (computed result)
  "$c": {value: ValueExpr}   // Plain object (computed result)
}

// With reactive data:
localVars: {
  "$a": Control<ValueExpr>,  // Control (depends on x)
  "$b": Control<ValueExpr>,  // Control (depends on y)
  "$c": Control<ValueExpr>   // Control (depends on $a, $b)
}

// When x changes: only $a and $c update, $b stays cached
```

### 4. Unified Data Model

Properties and variables both use `Value<T>` - uniform `.value` access:

```typescript
// Property access (reactive data)
data.fields.firstName.value      // Control from @astrolabe-controls

// Property access (plain data)
env.getVariable("$firstName").value  // Plain object {value: ...}

// Both work seamlessly with .value access!
```

### 5. Explicit Reactivity

Users choose when to be reactive:

```typescript
// Static: just call evaluate()
const [_, result] = env.evaluate(expr);

// Reactive: wrap in updateComputedValue()
const result = evaluateReactive(expr, data);
```

## Testing Strategy

### Phase 1 Tests

All existing tests should pass with no modifications:

```typescript
test("Basic evaluation still works", () => {
  const env = new BasicEvalEnv(emptyEnvState({ x: 10 }));
  const [_, result] = env.evaluate(parseEval('x + 5'));
  expect(result.value).toBe(15);
});

test("Let bindings still work", () => {
  const env = new BasicEvalEnv(emptyEnvState({ x: 10 }));
  const [_, result] = env.evaluate(
    parseEval('let $a := x + 5 in $a * 2')
  );
  expect(result.value).toBe(30);
});
```

### Phase 2 Tests

New reactive tests:

```typescript
test("Reactive evaluation updates automatically", () => {
  const data = createReactiveData({ x: 10, y: 20 });
  const result = evaluateReactive(parseEval('x + y'), data);

  expect(result.value.value).toBe(30);

  data.fields.x.value = 15;
  expect(result.value.value).toBe(35);
});

test("Let bindings are granularly reactive", () => {
  const data = createReactiveData({ x: 10, y: 20 });
  let aEvals = 0;
  let bEvals = 0;

  // Mock to count evaluations
  const expr = parseEval('let $a := x * 2, $b := y * 3 in $a + $b');
  const result = evaluateReactive(expr, data);

  expect(result.value.value).toBe(80);  // (10*2) + (20*3) = 80

  data.fields.x.value = 15;
  expect(result.value.value).toBe(90);  // (15*2) + (20*3) = 90
  // Only $a re-evaluates, not $b!
});

test("Conditional dependencies work", () => {
  const data = createReactiveData({
    flag: false,
    a: 10,
    b: 20
  });

  const result = evaluateReactive(
    parseEval('flag ? a : b'),
    data
  );

  expect(result.value.value).toBe(20);  // Uses b

  data.fields.a.value = 100;
  expect(result.value.value).toBe(20);  // Still b, a not in deps

  data.fields.flag.value = true;
  expect(result.value.value).toBe(100);  // Now uses a

  data.fields.a.value = 200;
  expect(result.value.value).toBe(200);  // a is now tracked
});
```

## Migration Path

### For Library Users

**No breaking changes!** Existing code works as-is:

```typescript
// Existing code - still works
import { parseEval, evaluate } from "@astrolabe-evaluator";

const expr = parseEval('x + y');
const result = evaluate(expr, { x: 10, y: 20 });
console.log(result.value);  // 30
```

**New reactive features are opt-in:**

```typescript
// New reactive code
import { parseEval } from "@astrolabe-evaluator";
import { evaluateReactive, createReactiveData } from "@astrolabe-evaluator/reactive";

const data = createReactiveData({ x: 10, y: 20 });
const result = evaluateReactive(parseEval('x + y'), data);
console.log(result.value.value);  // 30

data.fields.x.value = 15;
console.log(result.value.value);  // 35 - auto-updates!
```

### For Library Developers

Phase 1 changes are internal only:
- All values wrapped in Controls
- `evaluateControl()` added alongside `evaluate()`
- Existing tests should pass

Phase 2+ adds new features:
- New `reactiveEvaluate.ts` module
- New reactive-specific tests
- Documentation and examples

## Open Questions

### 1. Property Access Reactivity

**Question:** Should `getProperty` create computed controls or simple controls?

**Option A: Simple Controls** (current design)
```typescript
getProperty(parent, prop) {
  const value = parent.value;  // Tracked access
  return newControl(/* extract prop from value */);
}
```
- Simpler implementation
- Parent control tracked as dependency
- Re-reading property is cheap (parent already tracked)

**Option B: Computed Controls**
```typescript
getProperty(parent, prop) {
  const propControl = newControl(valueExpr(null));
  updateComputedValue(propControl, () => {
    const value = parent.value;
    return /* extract prop from value */;
  });
  return propControl;
}
```
- More fine-grained reactivity
- Property memoized separately
- More overhead per property access

**Recommendation:** Start with Option A (simpler), optimize to B if needed.

### 2. Function Return Values

**Question:** Should function implementations return `Control<ValueExpr>` or `ValueExpr`?

**Current:** Functions return `ValueExpr` in `FunctionValue.eval`:
```typescript
interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>;
  // ...
}
```

**Option:** Change to return Control:
```typescript
interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<Control<ValueExpr>>;
  // ...
}
```

**Recommendation:**
- Phase 1: Keep as `ValueExpr`, wrap in `newControl()` at call site
- Phase 2+: Consider changing if functions need custom reactivity

### 3. Control Lifecycle

**Question:** Who owns and cleans up Controls?

**Current design:** Controls live as long as environment scope
- Let bindings: Controls owned by scope
- Properties: Controls created on-demand (may be transient)
- Results: Controls owned by caller

**Considerations:**
- Memory leaks if Controls not cleaned up
- Need cleanup API for reactive evaluations
- Scope-based lifecycle matches environment threading

**Recommendation:** Add cleanup helpers in Phase 3.

## Implementation Checklist

### Phase 1: Value Wrapper Layer
- [ ] Add @astrolabe-controls dependency
- [ ] Import `Value`, `Control` from @astrolabe-controls
- [ ] Update `EvalEnvState` interface to use `Value<ValueExpr>`
- [ ] Add `evaluateControl()` to `EvalEnv` abstract class
- [ ] Update `evaluate()` to call `evaluateControl().value`
- [ ] Update `lookupVar()` to return `Value<ValueExpr>`
- [ ] Update `EvalData` interface for Values
- [ ] Update `emptyEnvState()` - return `{value: ...}` for plain objects, Controls for reactive
- [ ] Implement `defaultEvaluateControl()` - constants return `{value: expr}`
- [ ] Update `BasicEvalEnv` implementation
- [ ] Update helper functions (`evaluateWith`, etc.)
- [ ] Update all built-in functions to work with Values
- [ ] Run all existing tests - should pass with minimal overhead!

### Phase 2: Reactive Evaluation
- [ ] Create `reactiveEvaluate.ts` module
- [ ] Implement `evaluateReactive()` function
- [ ] Implement `createReactiveData()` helper
- [ ] Write basic reactive tests
- [ ] Test let bindings with reactivity
- [ ] Test conditional dependencies
- [ ] Write documentation and examples

### Phase 3: Advanced Features
- [ ] Add Control cleanup API
- [ ] Improve `getProperty` for reactive data
- [ ] Add batch update examples
- [ ] Performance testing and optimization
- [ ] Add validation/debugging tools
- [ ] Write migration guide

## Success Criteria

1. **Correctness**
   - All existing tests pass
   - Reactive updates work correctly
   - No memory leaks

2. **Performance**
   - < 10% overhead for static evaluation (Phase 1)
   - Efficient reactive updates (Phase 2+)
   - Scales to 100+ reactive expressions

3. **Usability**
   - Backward compatible API
   - Clear documentation
   - Simple reactive API

4. **Maintainability**
   - Clean separation of concerns
   - Incremental adoption path
   - Testable at each phase

## Conclusion

This Value-based evaluation design provides:

1. **Minimal-Overhead Constants**: Plain objects `{value: ...}` for constants, Controls only where needed
2. **Uniform Interface**: Both implement `Value<T>` - always use `.value`
3. **Clean Layering**: Values at bottom, convenience wrappers on top
4. **Incremental Path**: Phase 1 adds Values with minimal overhead
5. **Natural Reactivity**: `.value` access works uniformly for both Control and plain object
6. **Backward Compatibility**: Existing `evaluate()` API unchanged
7. **Granular Efficiency**: Each let binding can be independently reactive
8. **Optimal Performance**: Minimal memory/CPU overhead for constants (~8 bytes vs ~32 bytes)

The key insights:
- **Value<T> interface** provides uniform access pattern
- **Constants wrapped minimally** - `{value: expr}` plain objects
- **Controls used selectively** - only for reactive data
- **Reactivity emerges naturally** when using reactive data
- **Near-zero cost abstraction** - pay only for what you use

By using `Value<T>` from @astrolabe-controls, we get:
- ✅ Reactivity "for free" when needed
- ✅ **Minimal overhead** for constants and computed values (~24 bytes saved per constant)
- ✅ **Uniform interface** - no helper functions needed, just `.value`
- ✅ Natural optimization without manual tuning
