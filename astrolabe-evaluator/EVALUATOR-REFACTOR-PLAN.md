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
3. **Mutable memoization cache** - Variables evaluated once and cached
4. **Dependencies via `withDeps()`** - Explicit dependency collection
5. **Lazy error collection** - Client walks tree if all errors needed

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

**Add `errors` field:**

```typescript
export interface ValueExpr {
  type: "value";
  value?: string | number | boolean | Record<string, ValueExpr> | ValueExpr[] | null | undefined;
  function?: FunctionValue;
  path?: Path;
  deps?: EvalExpr[];        // Existing: dependencies for reactivity
  errors?: string[];        // NEW: error messages from evaluation
  location?: SourceLocation;
}
```

**Error format:**
- Array of human-readable error messages
- Undefined if no errors
- Accumulated from dependencies via `withDeps()`

### 2. EvalEnv Interface

**Change signature of `evaluateExpr()`:**

```typescript
abstract class EvalEnv {
  // BEFORE:
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr>;

  // AFTER:
  evaluateExpr(expr: EvalExpr): EvalExpr;
}
```

**Add `withDeps()` method:**

```typescript
abstract class EvalEnv {
  /**
   * Creates a ValueExpr with dependencies, propagating errors from deps.
   *
   * @param result - The ValueExpr to wrap (should not have deps/errors set yet)
   * @param deps - Array of dependent expressions (may include symbolic expressions)
   * @returns ValueExpr with deps and accumulated errors
   */
  withDeps(result: ValueExpr, deps: EvalExpr[]): ValueExpr;
}
```

**Add memoization cache (internal):**

```typescript
class BasicEvalEnv extends EvalEnv {
  // NEW: Mutable cache for variable evaluation results
  private evaluationCache = new Map<string, EvalExpr>();

  protected getCachedEvaluation(key: string): EvalExpr | undefined {
    return this.evaluationCache.get(key);
  }

  protected setCachedEvaluation(key: string, value: EvalExpr): void {
    this.evaluationCache.set(key);
  }
}
```

**Remove old helper functions:**

These become unnecessary:
- `mapEnv` - Just use `evaluateExpr()` directly
- `flatmapEnv` - No longer needed
- `mapAllEnv` - Use `.map()` directly
- `alterEnv` - Use `withVariables()` instead
- `envEffect` - Not needed with no tuple return

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

  // Collect errors from all ValueExpr dependencies
  const errors: string[] = [];
  for (const dep of deps) {
    if (dep.type === "value" && dep.errors) {
      errors.push(...dep.errors);
    }
  }

  // Combine with any existing errors in result
  const allErrors = result.errors
    ? [...result.errors, ...errors]
    : errors.length > 0
      ? errors
      : undefined;

  return {
    ...result,
    deps: deps.length > 0 ? deps : undefined,
    errors: allErrors,
  };
}
```

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

The cache should be invalidated when creating new scopes:

```typescript
withVariables(vars: Record<string, EvalExpr>): EvalEnv {
  // Create new environment with new scope
  const newState = {
    ...this.state,
    localVars: vars,
    parent: this.state, // Scope chain
  };

  // Create new environment with fresh cache
  const newEnv = new BasicEvalEnv(newState);
  // Cache is automatically fresh (new instance)

  return newEnv;
}
```

---

## Code Examples: Before vs After

### Example 1: Binary Function

**Before:**

```typescript
export function binFunction(
  func: (a: any, b: any, env: EvalEnv) => any,
  returnType: DataType
): FunctionValue {
  return functionValue((env, call) => {
    const [env1, a] = env.evaluateExpr(call.args[0]);
    const [env2, b] = env1.evaluateExpr(call.args[1]);

    if (a.type === "value" && b.type === "value") {
      return [env2, valueExprWithDeps(func(a.value, b.value, env2), [a, b])];
    }

    return [env2, { ...call, args: [a, b] }];
  }, returnType);
}
```

**After:**

```typescript
export function binFunction(
  func: (a: any, b: any, env: EvalEnv) => any,
  returnType: DataType
): FunctionValue {
  return functionValue((env, call) => {
    const a = env.evaluateExpr(call.args[0]);
    const b = env.evaluateExpr(call.args[1]);

    if (a.type === "value" && b.type === "value") {
      return env.withDeps(
        valueExpr(func(a.value, b.value, env)),
        [a, b]
      );
    }

    return { ...call, args: [a, b] };
  }, returnType);
}
```

**Reduction: 5 lines → 4 lines, much clearer data flow**

### Example 2: Array Evaluation

**Before:**

```typescript
case "array": {
  const [env1, elements] = mapAllEnv(
    env,
    expr.elements,
    (e, elem) => e.evaluateExpr(elem)
  );

  if (elements.every((e) => e.type === "value")) {
    return [
      env1,
      valueExprWithDeps(
        elements.map((e) => (e as ValueExpr).value),
        elements as ValueExpr[]
      ),
    ];
  }

  return [env1, { type: "array", elements }];
}
```

**After:**

```typescript
case "array": {
  const elements = expr.elements.map(e => env.evaluateExpr(e));

  if (elements.every(e => e.type === "value")) {
    return env.withDeps(
      valueExpr(elements.map(e => (e as ValueExpr).value)),
      elements as ValueExpr[]
    );
  }

  return { type: "array", elements };
}
```

**Reduction: 17 lines → 10 lines, no special helper needed**

### Example 3: Conditional Evaluation

**Before:**

```typescript
case "call": {
  if (expr.function === "$if") {
    const [env1, cond] = env.evaluateExpr(expr.args[0]);

    if (cond.type === "value") {
      const branchIndex = cond.value ? 1 : 2;
      const [env2, result] = env1.evaluateExpr(expr.args[branchIndex]);

      return [env2, env2.withDeps(result, [cond])];
    }

    const [env2, then] = env1.evaluateExpr(expr.args[1]);
    const [env3, else_] = env2.evaluateExpr(expr.args[2]);

    return [env3, { ...expr, args: [cond, then, else_] }];
  }
}
```

**After:**

```typescript
case "call": {
  if (expr.function === "$if") {
    const cond = env.evaluateExpr(expr.args[0]);

    if (cond.type === "value") {
      const branchIndex = cond.value ? 1 : 2;
      const result = env.evaluateExpr(expr.args[branchIndex]);

      return env.withDeps(result, [cond]);
    }

    const then = env.evaluateExpr(expr.args[1]);
    const else_ = env.evaluateExpr(expr.args[2]);

    return { ...expr, args: [cond, then, else_] };
  }
}
```

**Reduction: 15 lines → 13 lines, clearer control flow**

### Example 4: Let Expression

**Before:**

```typescript
case "let": {
  const [env1, value] = env.evaluateExpr(expr.value);
  const env2 = env1.withVariables({ [expr.variable]: value });
  const [env3, body] = env2.evaluateExpr(expr.body);
  return [env3, body];
}
```

**After:**

```typescript
case "let": {
  const value = env.evaluateExpr(expr.value);
  const env2 = env.withVariables({ [expr.variable]: value });
  return env2.evaluateExpr(expr.body);
}
```

**Reduction: 5 lines → 4 lines, no env threading**

### Example 5: Property Access

**Before:**

```typescript
case "property": {
  const [env1, target] = env.evaluateExpr(expr.target);

  if (target.type === "value") {
    const prop = target.value?.[expr.property];
    return [
      env1,
      valueExprWithDeps(
        prop,
        target.path ? [] : [target],
        target.path ? extendPath(target.path, expr.property) : undefined
      ),
    ];
  }

  return [env1, { ...expr, target }];
}
```

**After:**

```typescript
case "property": {
  const target = env.evaluateExpr(expr.target);

  if (target.type === "value") {
    const prop = target.value?.[expr.property];
    const result = valueExpr(prop, {
      path: target.path ? extendPath(target.path, expr.property) : undefined,
    });

    return target.path ? result : env.withDeps(result, [target]);
  }

  return { ...expr, target };
}
```

**Reduction: Similar length but clearer intent**

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

## Testing Strategy

### Unit Tests

**Test error propagation:**

```typescript
describe("Error propagation", () => {
  it("should propagate errors from dependencies", () => {
    const env = new BasicEvalEnv();
    const expr = parseExpr("$unknownVar + 5");

    const result = env.evaluateExpr(expr);

    expect(result.type).toBe("value");
    expect(result.errors).toContainEqual(
      expect.stringContaining("unknownVar not declared")
    );
  });

  it("should accumulate errors from multiple dependencies", () => {
    const env = new BasicEvalEnv();
    const expr = parseExpr("$unknown1 + $unknown2");

    const result = env.evaluateExpr(expr);

    expect(result.errors).toHaveLength(2);
  });

  it("should collect nested errors", () => {
    const env = new BasicEvalEnv();
    const expr = parseExpr("[$unknown1, [$unknown2, $unknown3]]");

    const result = env.evaluateExpr(expr);
    const allErrors = collectAllErrors(result);

    expect(allErrors).toHaveLength(3);
  });
});
```

**Test memoization:**

```typescript
describe("Memoization", () => {
  it("should evaluate variable only once", () => {
    let evalCount = 0;
    const expensive = functionValue((env, call) => {
      evalCount++;
      return valueExpr(42);
    });

    const env = new BasicEvalEnv().withVariables({
      "$expensive": valueExpr(null, { function: expensive }),
    });

    const expr = parseExpr("$expensive + $expensive");
    env.evaluateExpr(expr);

    expect(evalCount).toBe(1); // Only evaluated once
  });

  it("should not cache across scopes", () => {
    const env = new BasicEvalEnv().withVariables({ "$x": valueExpr(1) });

    const expr1 = parseExpr("let $x = 2 in $x");
    const result1 = env.evaluateExpr(expr1);

    const expr2 = parseExpr("$x");
    const result2 = env.evaluateExpr(expr2);

    expect((result1 as ValueExpr).value).toBe(2); // Inner scope
    expect((result2 as ValueExpr).value).toBe(1); // Outer scope
  });
});
```

**Test independence:**

```typescript
describe("Evaluation independence", () => {
  it("should not share side effects between siblings", () => {
    const env = new BasicEvalEnv();
    const expr = parseExpr("[$unknown1, $unknown2]");

    const result = env.evaluateExpr(expr);

    // Each element should have independent error
    const elements = (result as ValueExpr).value as ValueExpr[];
    expect(elements[0].errors).toBeDefined();
    expect(elements[1].errors).toBeDefined();
  });
});
```

### Integration Tests

**Test complex expressions:**

```typescript
describe("Complex expressions", () => {
  it("should handle nested conditionals with errors", () => {
    const env = new BasicEvalEnv().withVariables({
      "$x": valueExpr(5),
    });

    const expr = parseExpr("$if($x > 3, $unknown, $x)");
    const result = env.evaluateExpr(expr);

    // Should not evaluate false branch
    expect(result.type).toBe("value");
    expect(result.errors).toBeUndefined();
  });

  it("should handle array transformations", () => {
    const env = new BasicEvalEnv().withVariables({
      "$data": valueExpr([1, 2, 3]),
    });

    const expr = parseExpr("$map($data, $x => $x * 2)");
    const result = env.evaluateExpr(expr);

    expect((result as ValueExpr).value).toEqual([2, 4, 6]);
  });
});
```

### Regression Tests

**Ensure all existing tests pass:**

```bash
cd astrolabe-evaluator
npm test
```

All existing tests should continue to pass after migration, possibly with minor adjustments to match new error format.

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
