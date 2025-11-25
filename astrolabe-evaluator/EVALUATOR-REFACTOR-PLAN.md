# Evaluator Refactor Plan: Simplified API with Error Propagation

## Overview

### Current Architecture

The evaluator currently uses a "State Monad" pattern where `evaluateExpr()` returns `EnvValue<EvalExpr>`:

```typescript
export type EnvValue<T> = [EvalEnv, T];

// Usage:
const [env1, result1] = env.evaluateExpr(expr1);
const [env2, result2] = env1.evaluateExpr(expr2);
return [env2, combineResults(result1, result2)];
```

This threads environment state (errors, variable bindings, data context) through evaluations immutably.

### Proposed Architecture

Simplify the API by:
1. **Return just `EvalExpr`** - No tuple unpacking needed
2. **Errors in `ValueExpr.errors`** - Error messages as optional properties
3. **Extension data in `ValueExpr.data`** - Custom metadata for validators/extensions
4. **Mutable memoization cache** - Variables evaluated once and cached
5. **Dependencies via `withDeps()`** - Explicit dependency collection
6. **Uniform variable model** - `root` and `this` are just regular variables
7. **Single scope method** - `newScope(variables)` replaces multiple methods
8. **Static evaluate helper** - Validates full evaluation to ValueExpr
9. **Lazy error collection** - Client walks tree if all errors needed

```typescript
// Proposed usage:
const result1 = env.evaluateExpr(expr1);
const result2 = env.evaluateExpr(expr2);
return env.withDeps(combineResults(result1, result2), [result1, result2]);
```

### Key Benefits

1. **Simpler API** - 50% less boilerplate (no tuple unpacking)
2. **Built-in memoization** - Variables evaluated once, cached automatically
3. **Error locality** - Errors attached to the specific expression that failed
4. **Better debugging** - Error traces map directly to expression structure
5. **Cleaner code** - No `mapAllEnv`, `flatmapEnv` helper functions needed
6. **Independent evaluations** - No sibling side effects, easier to reason about

---

## API Changes

### 1. ValueExpr Interface

**Add `errors` and `data` fields:**

```typescript
export interface ValueExpr {
  type: "value";
  value?: string | number | boolean | Record<string, ValueExpr> | ValueExpr[] | null | undefined;
  function?: FunctionValue;
  path?: Path;
  deps?: EvalExpr[];        // Existing: dependencies for reactivity
  errors?: string[];        // NEW: error messages from evaluation
  data?: any;               // NEW: extension point for custom metadata (validation, etc.)
  location?: SourceLocation;
}
```

**Error format:**
- Array of human-readable error messages set directly on the ValueExpr during evaluation
- Undefined if no errors occurred during evaluation of this specific expression
- Errors from dependencies are collected lazily via `collectAllErrors()` when needed

**Data field:**
- Optional extension point for evaluator implementations
- Validation evaluators can store validation state
- Partial evaluators can store symbolic information
- Not used by default implementations

### 2. EvalEnv Interface

**Complete interface redesign:**

```typescript
// BEFORE: Complex state with special data/current fields
export interface EvalEnvState {
  data: EvalData | undefined;
  current: ValueExpr | undefined;
  localVars: Record<string, EvalExpr>;
  parent?: EvalEnvState;
  errors: string[];  // Moving to ValueExpr
  compare: (v1: unknown, v2: unknown) => number;
}

abstract class EvalEnv {
  abstract data: EvalData | undefined;
  abstract current: ValueExpr | undefined;
  abstract state: EvalEnvState;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withCurrent(path: ValueExpr): EvalEnv;
  abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;
  abstract evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr>;
}

// AFTER: Simplified - EvalEnv IS the scope chain node
abstract class EvalEnv {
  abstract localVars: Record<string, EvalExpr>;
  abstract parent?: EvalEnv;
  abstract compare: (v1: unknown, v2: unknown) => number;

  abstract getVariable(name: string): EvalExpr | undefined;
  abstract newScope(variables: Record<string, EvalExpr>): EvalEnv;
  abstract evaluateExpr(expr: EvalExpr): EvalExpr;
  abstract withDeps(result: ValueExpr, deps: EvalExpr[]): ValueExpr;
}

// Static helper - validates full evaluation
export function evaluate(env: EvalEnv, expr: EvalExpr): ValueExpr {
  const result = env.evaluateExpr(expr);
  if (result.type !== "value") {
    throw new Error("Expression did not fully evaluate");
  }
  return result;
}
```

**Key changes:**

1. **No EvalEnvState** - EvalEnv itself is the scope node
2. **No special data/current** - Use regular variables ("root", "this")
3. **Single scope method** - `newScope(variables)` replaces three methods
4. **No evaluate() method** - Use static `evaluate()` function instead
5. **No tuple returns** - `evaluateExpr()` returns just `EvalExpr`

**Variable model:**

```typescript
// "root" and "this" are just regular variables (no $ prefix internally)
const env = new BasicEvalEnv({
  localVars: {
    root: toValue(EmptyPath, myData),    // Root data context
    this: toValue(EmptyPath, myData),    // Current context
    x: valueExpr(42),                    // User variable
  },
  parent: undefined,
  compare: compareSignificantDigits(5),
});

// Access via $root, $this, $x in expression syntax
const expr = parseExpr("$this.name");
const result = env.evaluateExpr(expr);
```

**Memoization cache (internal):**

```typescript
class BasicEvalEnv extends EvalEnv {
  // NEW: Mutable cache for variable evaluation results
  private evaluationCache = new Map<string, EvalExpr>();

  protected getCachedEvaluation(key: string): EvalExpr | undefined {
    return this.evaluationCache.get(key);
  }

  protected setCachedEvaluation(key: string, value: EvalExpr): void {
    this.evaluationCache.set(key, value);
  }
}
```

**Remove old helper functions:**

These become unnecessary:
- `EnvValue<T>` type - No more tuple returns
- `EvalEnvState` interface - EvalEnv is the state
- `mapEnv` - Just use `evaluateExpr()` directly
- `flatmapEnv` - No longer needed
- `mapAllEnv` - Use `.map()` directly
- `alterEnv` - Use `newScope()` instead
- `envEffect` - Not needed with no tuple return
- `withVariables/withVariable/withCurrent` - Use `newScope()` instead
- `evaluate()` instance method - Use static `evaluate()` function

### 3. Helper Functions

**Add error collection utility:**

```typescript
/**
 * Recursively collects all errors from a ValueExpr and its dependencies.
 * Handles circular references via visited set.
 *
 * @param expr - The expression to collect errors from
 * @returns Array of all error messages found
 */
export function collectAllErrors(expr: EvalExpr): string[] {
  if (expr.type !== "value") return [];

  const errors: string[] = [];
  const visited = new Set<ValueExpr>();

  function walk(e: ValueExpr) {
    if (visited.has(e)) return;
    visited.add(e);

    if (e.errors) {
      errors.push(...e.errors);
    }

    if (e.deps) {
      for (const dep of e.deps) {
        if (dep.type === "value") {
          walk(dep);
        }
      }
    }
  }

  walk(expr);
  return errors;
}
```

**Add error checking utility:**

```typescript
/**
 * Checks if a ValueExpr or any of its dependencies has errors.
 *
 * @param expr - The expression to check
 * @returns true if any errors exist
 */
export function hasErrors(expr: EvalExpr): boolean {
  if (expr.type !== "value") return false;
  if (expr.errors) return true;

  if (expr.deps) {
    for (const dep of expr.deps) {
      if (hasErrors(dep)) return true;
    }
  }

  return false;
}
```

**Update `valueExpr()` helper:**

```typescript
// Keep existing:
export function valueExpr(
  value: any,
  opts?: {
    function?: FunctionValue;
    path?: Path;
    location?: SourceLocation;
  }
): ValueExpr;

// Add new variant for errors:
export function valueExprWithError(
  value: any,
  error: string | string[],
  opts?: {
    location?: SourceLocation;
  }
): ValueExpr {
  return {
    type: "value",
    value,
    errors: Array.isArray(error) ? error : [error],
    location: opts?.location,
  };
}
```

---

## Implementation Details

### 1. evaluateExpr() Implementation

**Basic pattern:**

```typescript
class BasicEvalEnv extends EvalEnv {
  evaluateExpr(expr: EvalExpr): EvalExpr {
    switch (expr.type) {
      case "value":
        return expr; // Already evaluated

      case "var":
        return this.evaluateVariable(expr);

      case "call":
        return this.evaluateCall(expr);

      case "property":
        return this.evaluateProperty(expr);

      case "let":
        return this.evaluateLet(expr);

      case "array":
        return this.evaluateArray(expr);

      case "lambda":
        return this.evaluateLambda(expr);
    }
  }
}
```

### 2. withDeps() Implementation

```typescript
withDeps(result: ValueExpr, deps: EvalExpr[]): ValueExpr {
  // Fast path: no deps
  if (deps.length === 0) {
    return result;
  }

  // Simply attach dependencies - errors are collected lazily by collectAllErrors()
  return {
    ...result,
    deps,
  };
}
```

**Key insight:** Errors are NOT propagated eagerly in `withDeps()`. Instead:
- Each ValueExpr may have its own `errors` field set during evaluation
- Dependencies are attached via the `deps` field
- `collectAllErrors()` walks the dependency tree lazily when errors are needed
- This keeps evaluation fast and error collection on-demand

### 3. Memoization Cache Implementation

**Variable evaluation with caching:**

```typescript
private evaluateVariable(expr: VarExpr): EvalExpr {
  const varName = expr.variable;

  // Check cache first
  const cached = this.getCachedEvaluation(varName);
  if (cached !== undefined) {
    return cached;
  }

  // Lookup variable binding
  const varExpr = this.getVariable(varName);

  if (varExpr == null) {
    // Variable not found - return error
    const result = valueExprWithError(
      null,
      `Variable $${varName} not declared`,
      { location: expr.location }
    );
    this.setCachedEvaluation(varName, result);
    return result;
  }

  // Evaluate and cache
  const result = this.evaluateExpr(varExpr);
  this.setCachedEvaluation(varName, result);
  return result;
}
```

**Cache invalidation:**

The cache is automatically invalidated when creating new scopes:

```typescript
newScope(variables: Record<string, EvalExpr>): EvalEnv {
  // Create new environment with new scope
  // The new env inherits this env as parent for variable lookup
  const newEnv = new BasicEvalEnv({
    localVars: variables,
    parent: this,  // Scope chain
    compare: this.compare,
  });

  // Cache is automatically fresh (new instance)
  return newEnv;
}
```

**getVariable implementation:**

```typescript
getVariable(name: string): EvalExpr | undefined {
  // Check local scope first
  if (name in this.localVars) {
    return this.localVars[name];
  }

  // Walk up scope chain
  return this.parent?.getVariable(name);
}
```

---

## Migration Strategy

### Phase 1: Preparation (Low Risk)

1. **Add new fields to ValueExpr**
   - Add `errors?: string[]` field
   - Update type definitions
   - Run tests to ensure no breakage (field is optional)

2. **Add helper functions**
   - Implement `collectAllErrors()`
   - Implement `hasErrors()`
   - Implement `valueExprWithError()`
   - Add tests for these utilities

3. **Add `withDeps()` method**
   - Implement on EvalEnv base class
   - Add unit tests
   - Document behavior

### Phase 2: Parallel Implementation (Medium Risk)

4. **Create new evaluation methods alongside old**
   - Add `evaluateExpr2(expr: EvalExpr): EvalExpr`
   - Keep old `evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr>`
   - Implement new version incrementally
   - Both versions coexist temporarily

5. **Migrate function implementations one-by-one**
   - Start with simple functions (literals, variables)
   - Move to complex functions (conditionals, arrays)
   - Test each migration thoroughly
   - Update tests to use new API

### Phase 3: Cutover (High Risk)

6. **Switch default method**
   - Rename old `evaluateExpr` → `evaluateExprOld`
   - Rename `evaluateExpr2` → `evaluateExpr`
   - Fix remaining call sites
   - Run full test suite

7. **Remove old implementation**
   - Delete `evaluateExprOld`
   - Delete old helper functions (`mapEnv`, `flatmapEnv`, etc.)
   - Clean up any remaining tuple unpacking
   - Update documentation

### Phase 4: Optimization (Low Risk)

8. **Implement memoization cache**
   - Add cache to BasicEvalEnv
   - Implement cache in variable evaluation
   - Add cache invalidation in scope creation
   - Performance test to verify improvements

9. **Update dependent code**
   - Update any code that calls `evaluateExpr()`
   - Add error collection where needed
   - Update reactive evaluation if needed
   - Update documentation and examples

### Rollback Plan

If issues arise:
1. Keep old implementation available during migration
2. Feature flag to switch between old/new implementations
3. Comprehensive test suite to catch regressions
4. Git branch for easy rollback

---

## Test Preparation Strategy

To minimize test churn during the refactor, we've abstracted all direct calls to `env.evaluate()` and `env.evaluateExpr()` behind helper functions. This means when the API changes, only the helper implementations need updating - not the 404 individual test cases.

### Helper Function Abstraction Layer

Created `test/testHelpers.ts` with 5 core helper functions:

1. **`evalResult<T>(env: EvalEnv, expr: EvalExpr): T`**
   - For tests that just need the evaluation result
   - Replaces: `const [_, result] = env.evaluateExpr(expr);`
   - Usage: Most common case (~140+ test callsites)

2. **`evalWithErrors(env: EvalEnv, expr: EvalExpr): { result: ValueExpr; errors: string[] }`**
   - For tests that need to check error conditions
   - Replaces: `const [nextEnv, result] = env.evaluate(expr); expect(nextEnv.errors.length)...`
   - Usage: Only 3 tests check environment errors

3. **`evalExpr(expr: string, data?: unknown): unknown`**
   - Convenience helper for simple expression evaluation
   - Parses expression, creates basic environment, returns value
   - Usage: Common in syntax and operator tests

4. **`evalExprNative(expr: string, data?: unknown): unknown`**
   - Like evalExpr but converts result to native JS via toNative()
   - Usage: Tests expecting plain JS objects/arrays

5. **`evalToArray(expr: string, data?: unknown): unknown[]`**
   - Specialized for tests expecting array results
   - Includes type validation (throws if result not an array)
   - Usage: Array operation tests

### Migration Statistics

Successfully migrated all test files to use helpers:

- **test/comparison-partial-eval.test.ts**: 6 evaluate calls → evalResult()
- **test/defaultFunctions.test.ts**: Consolidated local helpers → testHelpers
- **test/commentSyntax.test.ts**: Consolidated local helpers → testHelpers
- **test/partialEvaluation.test.ts**: 67 evaluate calls → evalResult(), 2 error tests → evalWithErrors()
- **test/dependencyTracking.test.ts**: 62 evaluate calls → evalResult()

**Result**: All 404 tests passing with helper abstraction in place.

### Benefits of This Approach

1. **Minimal test churn**: When evaluate() signature changes, update 5 helpers instead of 140+ test callsites
2. **Type safety**: Helpers provide better type inference than tuple unpacking
3. **Readability**: `evalResult(env, expr)` is clearer than `const [_, result] = env.evaluateExpr(expr)`
4. **Consistency**: All tests use same patterns for evaluation
5. **Easy migration**: When refactor completes, helpers can be updated to new API seamlessly

### Implementation Notes

The helper functions currently use the old tuple-returning API internally:

```typescript
export function evalResult<T = EvalExpr>(env: EvalEnv, expr: EvalExpr): T {
  const [_, result] = env.evaluateExpr(expr);
  return result as T;
}
```

After the refactor, they'll be updated to use the new direct-return API:

```typescript
export function evalResult<T = EvalExpr>(env: EvalEnv, expr: EvalExpr): T {
  return env.evaluateExpr(expr) as T;
}
```

This abstraction layer allows the refactor to proceed without touching most test code.

### C# Test Helpers

The same approach has been implemented for the C# evaluator in `Astrolabe.Evaluator.Test/TestHelpers.cs`:

**9 helper methods created:**

1. **`EvalResult(env, expr)`** - Extension method returning just the `ValueExpr` result
2. **`EvalPartial(env, expr)`** - Extension method for partial evaluation (returns `EvalExpr`)
3. **`EvalWithErrors(env, expr)`** - Returns tuple with result and errors
4. **`EvalExpr(string, data)`** - Static helper for simple string evaluation
5. **`EvalExprNative(string, data)`** - Returns native C# objects via `ToNative()`
6. **`EvalToArray(string, data)`** - Returns array results with validation
7. **`CreateBasicEnv(data)`** - Creates full evaluation environment
8. **`CreatePartialEnv(data)`** - Creates partial evaluation environment
9. **`Parse(string)`** - Convenience wrapper for `ExprParser.Parse()`

**Key C# differences from TypeScript:**

- Uses **extension methods** on `EvalEnvironment` for cleaner syntax
- C# tuple destructuring: `var (env, result) = env.Evaluate(expr)`
- Stronger type safety with explicit `ValueExpr`, `CallExpr`, etc.
- Uses `System.Text.Json.Nodes.JsonObject` for test data
- Built-in `ToNative()` method on `ValueExpr` for native conversion

**C# Migration Statistics:**

- **11 test files** in Astrolabe.Evaluator.Test
- **~137 evaluation calls** to migrate (optional)
- **5,373 lines** of test code total
- Existing helpers in 6 files can be consolidated

The C# helpers currently use the old API internally:
```csharp
public static ValueExpr EvalResult(this EvalEnvironment env, EvalExpr expr)
{
    var (_, result) = env.Evaluate(expr);
    return result;
}
```

After refactor, they'll use the new direct-return API:
```csharp
public static ValueExpr EvalResult(this EvalEnvironment env, EvalExpr expr)
{
    return env.Evaluate(expr);
}
```

---

## Testing Strategy

### Unit Tests

Test areas to cover:
- **Error propagation** - Verify errors are set on ValueExpr during evaluation
- **Error collection** - Test `collectAllErrors()` walks dependency tree correctly
- **Memoization** - Verify variables are evaluated once and cached within scope
- **Scope isolation** - Ensure caches don't leak across scopes
- **Evaluation independence** - Confirm sibling evaluations don't share side effects

### Integration Tests

Test areas to cover:
- **Complex expressions** - Nested conditionals, array operations, function calls
- **Error handling** - Errors in various expression types and compositions
- **Performance** - Benchmark memoization benefits and error collection overhead

### Regression Tests

All existing tests should continue to pass after migration, possibly with minor adjustments to match the new API (no tuple unpacking, error collection via `collectAllErrors()`).

---

## Performance Considerations

### Memoization Benefits

**Before (no memoization):**
```typescript
// Expression: let $x = expensiveFunc() in [$x, $x, $x]
// expensiveFunc() called 3 times
```

**After (with memoization):**
```typescript
// Expression: let $x = expensiveFunc() in [$x, $x, $x]
// expensiveFunc() called 1 time, cached for subsequent accesses
```

**Expected improvement:** 50-90% reduction in redundant evaluations for expressions with repeated variable references.

### Error Propagation Cost

**withDeps() complexity:**
- O(n) where n = number of dependencies
- Typically small (2-5 deps for most operations)
- Only ValueExpr checked (symbolic expressions skipped)

**collectAllErrors() complexity:**
- O(nodes) where nodes = total ValueExpr in dependency tree
- Lazy evaluation - only called when client needs errors
- Visited set prevents redundant work on shared deps

**Expected impact:** Negligible - error collection is lightweight and lazy.

### Memory Considerations

**Memoization cache:**
- Size: O(variables in scope)
- Lifetime: Scope-local (GC'd when scope exits)
- Trade-off: Small memory overhead for significant performance gain

**Error storage:**
- Only on failed ValueExpr (typically rare)
- String arrays are small
- Natural GC when expression tree is discarded

**Expected impact:** Minimal - estimated < 5% memory increase for typical expressions.

### Performance Testing

Benchmark key scenarios:
1. **Deep variable references** - Ensure memoization helps
2. **Large array operations** - Ensure no regression
3. **Complex conditionals** - Ensure branch optimization works
4. **Error cases** - Ensure error propagation is fast

Target: New implementation should be **equal or faster** than current implementation.

---

## Breaking Changes

### API Changes

1. **`evaluateExpr()` signature change**
   - **Before:** `evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr>`
   - **After:** `evaluateExpr(expr: EvalExpr): EvalExpr`
   - **Impact:** All call sites need updating (remove tuple unpacking)

2. **Removed helper functions**
   - `mapEnv`, `flatmapEnv`, `mapAllEnv`, `alterEnv`, `envEffect`
   - **Impact:** Use direct `.map()` and `evaluateExpr()` instead

3. **Error location change**
   - **Before:** Errors in `env.state.errors`
   - **After:** Errors in `ValueExpr.errors`
   - **Impact:** Use `collectAllErrors()` to gather all errors

### Migration Guide for Consumers

**If you call evaluateExpr():**

```typescript
// Before:
const [newEnv, result] = env.evaluateExpr(expr);
if (newEnv.state.errors.length > 0) {
  console.error(newEnv.state.errors);
}

// After:
const result = env.evaluateExpr(expr);
const errors = collectAllErrors(result);
if (errors.length > 0) {
  console.error(errors);
}
```

**If you implement custom functions:**

```typescript
// Before:
const myFunc = functionValue((env, call) => {
  const [env1, arg] = env.evaluateExpr(call.args[0]);
  return [env1, valueExpr(doSomething(arg.value))];
});

// After:
const myFunc = functionValue((env, call) => {
  const arg = env.evaluateExpr(call.args[0]);
  return env.withDeps(valueExpr(doSomething(arg.value)), [arg]);
});
```

**If you use mapAllEnv:**

```typescript
// Before:
const [newEnv, results] = mapAllEnv(env, items, (e, item) => e.evaluateExpr(item));

// After:
const results = items.map(item => env.evaluateExpr(item));
```

---

## Open Questions

1. **Partial evaluation caching**
   - Should PartialEvalEnv also have memoization?
   - Symbolic expressions can be large - cache them?

2. **Error message format**
   - Should errors include source location in the message?
   - Should errors include expression context?

3. **Performance targets**
   - What benchmark suite should we use?
   - What performance regression is acceptable?

4. **Backwards compatibility**
   - Do we need a compatibility layer?
   - Can we version the API?

---

## Timeline Estimate

**Phase 1 (Preparation): 1-2 days**
- Add fields, helpers, tests
- Low risk, can be done incrementally

**Phase 2 (Parallel Implementation): 3-5 days**
- Implement new methods
- Migrate functions one-by-one
- High test coverage

**Phase 3 (Cutover): 1-2 days**
- Switch default, fix call sites
- Run comprehensive tests
- Monitor for issues

**Phase 4 (Optimization): 2-3 days**
- Add memoization
- Performance testing
- Documentation updates

**Total: 7-12 days** (1-2 weeks with buffer for issues)

---

## Success Criteria

1. **All tests pass** - No regressions in functionality
2. **Performance maintained or improved** - Benchmarks show no slowdown
3. **Code reduction** - 30-50% less boilerplate in evaluation code
4. **Error traceability** - Errors clearly map to failing expressions
5. **Documentation updated** - All examples and guides reflect new API

---

## Conclusion

This refactor significantly simplifies the evaluator API while adding useful memoization. The key insight is that **errors don't need global accumulation** - they flow naturally through the dependency graph and can be collected lazily when needed.

The mutable cache is a pragmatic optimization that doesn't compromise purity - it's just memoization, not observable side effects affecting semantics.

The migration is straightforward but requires careful testing due to the pervasive nature of `evaluateExpr()` throughout the codebase. A phased approach with parallel implementation minimizes risk.

**Recommendation: Proceed with refactor.** The benefits (simpler API, memoization, better error tracing) significantly outweigh the migration cost.
