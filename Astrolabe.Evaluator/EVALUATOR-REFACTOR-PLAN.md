# Evaluator Refactor Plan: Simplified API with Error Propagation (C#)

## Overview

### Current Architecture

The evaluator currently uses a "State Monad" pattern where `Evaluate()` and `EvaluateExpr()` return `EnvironmentValue<T>`:

```csharp
public interface EnvironmentValue<out T>
{
    EvalEnvironment Env { get; }
    T Value { get; }
}

// Usage:
var (env1, result1) = env.EvaluateExpr(expr1);
var (env2, result2) = env1.EvaluateExpr(expr2);
return (env2, CombineResults(result1, result2));
```

This threads environment state (errors, variable bindings, data context) through evaluations immutably.

### Proposed Architecture

Simplify the API by:
1. **Return just `EvalExpr`** - No tuple unpacking needed
2. **Errors in `ValueExpr.Errors`** - Error messages as optional properties
3. **Extension data in `ValueExpr.Data`** - Custom metadata for validators/extensions
4. **Mutable memoization cache** - Variables evaluated once and cached
5. **Dependencies via `WithDeps()`** - Explicit dependency collection
6. **Uniform variable model** - `root` and `this` are just regular variables
7. **Single scope method** - `NewScope(variables)` replaces multiple methods
8. **Static evaluate helper** - Validates full evaluation to ValueExpr
9. **Lazy error collection** - Client walks tree if all errors needed

```csharp
// Proposed usage:
var result1 = env.EvaluateExpr(expr1);
var result2 = env.EvaluateExpr(expr2);
return env.WithDeps(CombineResults(result1, result2), new[] { result1, result2 });
```

### Key Benefits

1. **Simpler API** - 50% less boilerplate (no tuple unpacking)
2. **Built-in memoization** - Variables evaluated once, cached automatically
3. **Error locality** - Errors attached to the specific expression that failed
4. **Better debugging** - Error traces map directly to expression structure
5. **Cleaner code** - No helper methods for threading state
6. **Independent evaluations** - No sibling side effects, easier to reason about

---

## API Changes

### 1. ValueExpr Record

**Add `Errors` and `Data` properties:**

```csharp
// BEFORE
public record ValueExpr(
    object? Value,
    FunctionValue? Function = null,
    Path? Path = null,
    ImmutableArray<EvalExpr>? Deps = null,
    SourceLocation? Location = null
) : EvalExpr;

// AFTER
public record ValueExpr(
    object? Value,
    FunctionValue? Function = null,
    Path? Path = null,
    ImmutableArray<EvalExpr>? Deps = null,
    ImmutableArray<EvalError>? Errors = null,  // NEW: error messages from evaluation
    object? Data = null,                        // NEW: extension point for custom metadata
    SourceLocation? Location = null
) : EvalExpr;
```

**Error format:**
- ImmutableArray of `EvalError` objects set directly on the ValueExpr during evaluation
- Null if no errors occurred during evaluation of this specific expression
- Errors from dependencies are collected lazily via `CollectAllErrors()` when needed

**Data property:**
- Optional extension point for evaluator implementations
- Validation evaluators can store validation state
- Partial evaluators can store symbolic information
- Not used by default implementations

### 2. EvalEnvironment Abstract Class

**Complete interface redesign:**

```csharp
// BEFORE: Complex state with special Data/Current fields
public record EvalEnvironmentState(
    EvalData? Data,
    ValueExpr? Current,
    ImmutableDictionary<string, EvalExpr> LocalVars,
    EvalEnvironmentState? Parent,
    ImmutableArray<EvalError> Errors,  // Moving to ValueExpr
    Func<object?, object?, int> Compare
);

public abstract class EvalEnvironment
{
    public abstract EvalData? Data { get; }
    public abstract ValueExpr? Current { get; }
    public abstract EvalEnvironmentState State { get; }

    public abstract EvalEnvironment WithVariables(params (string, EvalExpr)[] vars);
    public abstract EvalEnvironment WithVariable(string name, EvalExpr expr);
    public abstract EvalEnvironment WithCurrent(ValueExpr current);
    public abstract EnvironmentValue<ValueExpr> Evaluate(EvalExpr expr);
    public abstract EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr expr);
}

// AFTER: Simplified - EvalEnvironment IS the scope chain node
public abstract class EvalEnvironment
{
    public abstract ImmutableDictionary<string, EvalExpr> LocalVars { get; }
    public abstract EvalEnvironment? Parent { get; }
    public abstract Func<object?, object?, int> Compare { get; }

    public abstract EvalExpr? GetVariable(string name);
    public abstract EvalEnvironment NewScope(ImmutableDictionary<string, EvalExpr> variables);
    public abstract EvalExpr EvaluateExpr(EvalExpr expr);
    public abstract ValueExpr WithDeps(ValueExpr result, ImmutableArray<EvalExpr> deps);
}

// Static helper - validates full evaluation
public static class EvalExtensions
{
    public static ValueExpr Evaluate(this EvalEnvironment env, EvalExpr expr)
    {
        var result = env.EvaluateExpr(expr);
        if (result is not ValueExpr valueExpr)
        {
            throw new InvalidOperationException("Expression did not fully evaluate");
        }
        return valueExpr;
    }
}
```

**Key changes:**

1. **No EvalEnvironmentState** - EvalEnvironment itself is the scope node
2. **No special Data/Current** - Use regular variables ("root", "this")
3. **Single scope method** - `NewScope(variables)` replaces three methods
4. **No Evaluate() method** - Use extension method `Evaluate()` instead
5. **No tuple returns** - `EvaluateExpr()` returns just `EvalExpr`

**Variable model:**

```csharp
// "root" and "this" are just regular variables (no $ prefix internally)
var env = new BasicEvalEnvironment(
    localVars: ImmutableDictionary<string, EvalExpr>.Empty
        .Add("root", ToValue(EmptyPath, myData))    // Root data context
        .Add("this", ToValue(EmptyPath, myData))    // Current context
        .Add("x", new ValueExpr(42)),               // User variable
    parent: null,
    compare: CompareSignificantDigits(5)
);

// Access via $root, $this, $x in expression syntax
var expr = ExprParser.Parse("$this.name");
var result = env.EvaluateExpr(expr);
```

**Memoization cache (internal):**

```csharp
public class BasicEvalEnvironment : EvalEnvironment
{
    // NEW: Mutable cache for variable evaluation results
    private readonly Dictionary<string, EvalExpr> _evaluationCache = new();

    protected EvalExpr? GetCachedEvaluation(string key)
    {
        return _evaluationCache.TryGetValue(key, out var value) ? value : null;
    }

    protected void SetCachedEvaluation(string key, EvalExpr value)
    {
        _evaluationCache[key] = value;
    }
}
```

**Remove old types and methods:**

These become unnecessary:
- `EnvironmentValue<T>` interface - No more tuple returns
- `BasicEnvironmentValue<T>` record - No more tuple returns
- `EvalEnvironmentState` record - EvalEnvironment is the state
- `WithVariables()` - Use `NewScope()` instead
- `WithVariable()` - Use `NewScope()` instead
- `WithCurrent()` - Use `NewScope()` with "this" variable
- `Evaluate()` instance method - Use extension method `Evaluate()`

### 3. Helper Functions

**Add error collection utility:**

```csharp
/// <summary>
/// Recursively collects all errors from a ValueExpr and its dependencies.
/// Handles circular references via visited set.
/// </summary>
/// <param name="expr">The expression to collect errors from</param>
/// <returns>Array of all error messages found</returns>
public static ImmutableArray<EvalError> CollectAllErrors(EvalExpr expr)
{
    if (expr is not ValueExpr valueExpr)
        return ImmutableArray<EvalError>.Empty;

    var errors = ImmutableArray.CreateBuilder<EvalError>();
    var visited = new HashSet<ValueExpr>();

    void Walk(ValueExpr e)
    {
        if (!visited.Add(e)) return;

        if (e.Errors is not null)
        {
            errors.AddRange(e.Errors);
        }

        if (e.Deps is not null)
        {
            foreach (var dep in e.Deps)
            {
                if (dep is ValueExpr depValue)
                {
                    Walk(depValue);
                }
            }
        }
    }

    Walk(valueExpr);
    return errors.ToImmutable();
}
```

**Add error checking utility:**

```csharp
/// <summary>
/// Checks if a ValueExpr or any of its dependencies has errors.
/// </summary>
/// <param name="expr">The expression to check</param>
/// <returns>true if any errors exist</returns>
public static bool HasErrors(EvalExpr expr)
{
    if (expr is not ValueExpr valueExpr) return false;
    if (valueExpr.Errors is not null && valueExpr.Errors.Length > 0) return true;

    if (valueExpr.Deps is not null)
    {
        foreach (var dep in valueExpr.Deps)
        {
            if (HasErrors(dep)) return true;
        }
    }

    return false;
}
```

**Update ValueExpr factory methods:**

```csharp
// Keep existing:
public static ValueExpr CreateValue(
    object? value,
    FunctionValue? function = null,
    Path? path = null,
    SourceLocation? location = null
)
{
    return new ValueExpr(value, function, path, null, null, null, location);
}

// Add new variant for errors:
public static ValueExpr CreateValueWithError(
    object? value,
    EvalError error,
    SourceLocation? location = null
)
{
    return new ValueExpr(
        value,
        null,
        null,
        null,
        ImmutableArray.Create(error),
        null,
        location
    );
}

public static ValueExpr CreateValueWithErrors(
    object? value,
    ImmutableArray<EvalError> errors,
    SourceLocation? location = null
)
{
    return new ValueExpr(value, null, null, null, errors, null, location);
}
```

---

## Implementation Details

### 1. EvaluateExpr() Implementation

**Basic pattern:**

```csharp
public class BasicEvalEnvironment : EvalEnvironment
{
    public override EvalExpr EvaluateExpr(EvalExpr expr)
    {
        return expr switch
        {
            ValueExpr value => value, // Already evaluated
            VarExpr var => EvaluateVariable(var),
            CallExpr call => EvaluateCall(call),
            PropertyExpr prop => EvaluateProperty(prop),
            LetExpr let => EvaluateLet(let),
            ArrayExpr array => EvaluateArray(array),
            LambdaExpr lambda => EvaluateLambda(lambda),
            _ => throw new NotImplementedException($"Unknown expression type: {expr.GetType().Name}")
        };
    }
}
```

### 2. WithDeps() Implementation

```csharp
public override ValueExpr WithDeps(ValueExpr result, ImmutableArray<EvalExpr> deps)
{
    // Fast path: no deps
    if (deps.IsEmpty)
    {
        return result;
    }

    // Simply attach dependencies - errors are collected lazily by CollectAllErrors()
    return result with { Deps = deps };
}
```

**Key insight:** Errors are NOT propagated eagerly in `WithDeps()`. Instead:
- Each ValueExpr may have its own `Errors` field set during evaluation
- Dependencies are attached via the `Deps` field
- `CollectAllErrors()` walks the dependency tree lazily when errors are needed
- This keeps evaluation fast and error collection on-demand

### 3. Memoization Cache Implementation

**Variable evaluation with caching:**

```csharp
private EvalExpr EvaluateVariable(VarExpr expr)
{
    var varName = expr.Variable;

    // Check cache first
    var cached = GetCachedEvaluation(varName);
    if (cached is not null)
    {
        return cached;
    }

    // Lookup variable binding
    var varExpr = GetVariable(varName);

    if (varExpr is null)
    {
        // Variable not found - return error
        var result = CreateValueWithError(
            null,
            new EvalError($"Variable ${varName} not declared"),
            expr.Location
        );
        SetCachedEvaluation(varName, result);
        return result;
    }

    // Evaluate and cache
    var evaluated = EvaluateExpr(varExpr);
    SetCachedEvaluation(varName, evaluated);
    return evaluated;
}
```

**Cache invalidation:**

The cache is automatically invalidated when creating new scopes:

```csharp
public override EvalEnvironment NewScope(ImmutableDictionary<string, EvalExpr> variables)
{
    // Create new environment with new scope
    // The new env inherits this env as parent for variable lookup
    var newEnv = new BasicEvalEnvironment(
        localVars: variables,
        parent: this,  // Scope chain
        compare: Compare
    );

    // Cache is automatically fresh (new instance)
    return newEnv;
}
```

**GetVariable implementation:**

```csharp
public override EvalExpr? GetVariable(string name)
{
    // Check local scope first
    if (LocalVars.TryGetValue(name, out var expr))
    {
        return expr;
    }

    // Walk up scope chain
    return Parent?.GetVariable(name);
}
```

---

## Migration Strategy

### Phase 1: Preparation (Low Risk)

1. **Add new properties to ValueExpr**
   - Add `Errors` property (ImmutableArray<EvalError>?)
   - Add `Data` property (object?)
   - Update record definition
   - Run tests to ensure no breakage (properties are optional)

2. **Add helper functions**
   - Implement `CollectAllErrors()`
   - Implement `HasErrors()`
   - Implement `CreateValueWithError()` and `CreateValueWithErrors()`
   - Add tests for these utilities

3. **Add `WithDeps()` method**
   - Implement on EvalEnvironment base class
   - Add unit tests
   - Document behavior

### Phase 2: Parallel Implementation (Medium Risk)

4. **Create new evaluation methods alongside old**
   - Add `EvaluateExpr2(EvalExpr expr): EvalExpr`
   - Keep old `EvaluateExpr(EvalExpr expr): EnvironmentValue<EvalExpr>`
   - Implement new version incrementally
   - Both versions coexist temporarily

5. **Migrate function implementations one-by-one**
   - Start with simple functions (literals, variables)
   - Move to complex functions (conditionals, arrays)
   - Test each migration thoroughly
   - Update tests to use new API

### Phase 3: Cutover (High Risk)

6. **Switch default method**
   - Rename old `EvaluateExpr` → `EvaluateExprOld`
   - Rename `EvaluateExpr2` → `EvaluateExpr`
   - Fix remaining call sites
   - Run full test suite

7. **Remove old implementation**
   - Delete `EvaluateExprOld`
   - Delete `EnvironmentValue<T>` interface
   - Delete `BasicEnvironmentValue<T>` record
   - Clean up any remaining tuple unpacking
   - Update documentation

### Phase 4: Optimization (Low Risk)

8. **Implement memoization cache**
   - Add cache to BasicEvalEnvironment
   - Implement cache in variable evaluation
   - Add cache invalidation in scope creation
   - Performance test to verify improvements

9. **Update dependent code**
   - Update any code that calls `EvaluateExpr()`
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

To minimize test churn during the refactor, we've abstracted all direct calls to `env.Evaluate()` and `env.EvaluateExpr()` behind helper methods. This means when the API changes, only the helper implementations need updating - not the 413 individual test cases.

### Helper Method Abstraction Layer

Created `Astrolabe.Evaluator.Test/TestHelpers.cs` with 9 core helper methods:

1. **`EvalResult(env, expr)`** - Extension method for tests that just need the result
   - Replaces: `var (_, result) = env.Evaluate(expr);`
   - Usage: Most common case (~60+ test callsites)

2. **`EvalPartial(env, expr)`** - Extension method for partial evaluation
   - Replaces: `var (_, result) = env.EvaluateExpr(expr);`
   - Usage: Partial evaluation tests (~70+ callsites)

3. **`EvalWithErrors(env, expr)`** - Returns result and errors tuple
   - Replaces: `var (nextEnv, result) = env.Evaluate(expr); var errors = nextEnv.Errors;`
   - Usage: Only 3 tests check environment errors

4. **`EvalExpr(string, data)`** - Static helper for simple expression evaluation
   - Parses expression, creates basic environment, returns value
   - Usage: Common in syntax and operator tests

5. **`EvalExprNative(string, data)`** - Returns native C# objects via ToNative()
   - Usage: Tests expecting plain C# objects/arrays

6. **`EvalToArray(string, data)`** - Returns array results with validation
   - Usage: Array operation tests

7. **`CreateBasicEnv(data)`** - Creates full evaluation environment
   - Replaces local helper methods in test files

8. **`CreatePartialEnv(data)`** - Creates partial evaluation environment
   - Replaces local helper methods in test files

9. **`Parse(string)`** - Convenience wrapper for ExprParser.Parse()
   - Replaces local helper methods in test files

### Migration Statistics

Successfully migrated all test files to use helpers:

- **ComparisonPartialEvalTests.cs**: 9 evaluate calls → EvalPartial()
- **CommentSyntaxTests.cs**: Consolidated local helpers → TestHelpers
- **CommentConflictTests.cs**: Consolidated local helpers → TestHelpers
- **DefaultFunctionsTests.cs**: ~200 tests migrated, 1 error test → EvalWithErrors()
- **DependencyTrackingTests.cs**: ~60 evaluate calls → EvalResult()
- **PartialEvaluationTests.cs**: ~100 evaluate calls → EvalPartial(), 2 error tests → EvalWithErrors()

**Result**: All 413 tests passing with helper abstraction in place.

### Benefits of This Approach

1. **Minimal test churn**: When Evaluate() signature changes, update 9 helpers instead of 137+ test callsites
2. **Type safety**: Extension methods provide cleaner syntax than tuple unpacking
3. **Readability**: `env.EvalResult(expr)` is clearer than `var (_, result) = env.Evaluate(expr);`
4. **Consistency**: All tests use same patterns for evaluation
5. **Easy migration**: When refactor completes, helpers can be updated to new API seamlessly

### Implementation Notes

The helper methods currently use the old tuple-returning API internally:

```csharp
public static ValueExpr EvalResult(this EvalEnvironment env, EvalExpr expr)
{
    var (_, result) = env.Evaluate(expr);
    return result;
}
```

After the refactor, they'll be updated to use the new direct-return API:

```csharp
public static ValueExpr EvalResult(this EvalEnvironment env, EvalExpr expr)
{
    return env.Evaluate(expr);
}
```

This abstraction layer allows the refactor to proceed without touching most test code.

---

## Testing Strategy

### Unit Tests

Test areas to cover:
- **Error propagation** - Verify errors are set on ValueExpr during evaluation
- **Error collection** - Test `CollectAllErrors()` walks dependency tree correctly
- **Memoization** - Verify variables are evaluated once and cached within scope
- **Scope isolation** - Ensure caches don't leak across scopes
- **Evaluation independence** - Confirm sibling evaluations don't share side effects

### Integration Tests

Test areas to cover:
- **Complex expressions** - Nested conditionals, array operations, function calls
- **Error handling** - Errors in various expression types and compositions
- **Performance** - Benchmark memoization benefits and error collection overhead

### Regression Tests

All existing tests should continue to pass after migration, possibly with minor adjustments to match the new API (no tuple unpacking, error collection via `CollectAllErrors()`).

---

## Performance Considerations

### Memoization Benefits

**Before (no memoization):**
```csharp
// Expression: let $x = ExpensiveFunc() in [$x, $x, $x]
// ExpensiveFunc() called 3 times
```

**After (with memoization):**
```csharp
// Expression: let $x = ExpensiveFunc() in [$x, $x, $x]
// ExpensiveFunc() called 1 time, cached for subsequent accesses
```

**Expected improvement:** 50-90% reduction in redundant evaluations for expressions with repeated variable references.

### Error Propagation Cost

**WithDeps() complexity:**
- O(n) where n = number of dependencies
- Typically small (2-5 deps for most operations)
- Only ValueExpr checked (symbolic expressions skipped)

**CollectAllErrors() complexity:**
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
- ImmutableArray<EvalError> is small
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

1. **`EvaluateExpr()` signature change**
   - **Before:** `EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr expr)`
   - **After:** `EvalExpr EvaluateExpr(EvalExpr expr)`
   - **Impact:** All call sites need updating (remove tuple unpacking)

2. **Removed types and methods**
   - `EnvironmentValue<T>`, `BasicEnvironmentValue<T>`
   - `WithVariables()`, `WithVariable()`, `WithCurrent()`
   - **Impact:** Use `NewScope()` instead

3. **Error location change**
   - **Before:** Errors in `env.State.Errors`
   - **After:** Errors in `ValueExpr.Errors`
   - **Impact:** Use `CollectAllErrors()` to gather all errors

### Migration Guide for Consumers

**If you call EvaluateExpr():**

```csharp
// Before:
var (newEnv, result) = env.EvaluateExpr(expr);
if (newEnv.Errors.Length > 0)
{
    Console.WriteLine(string.Join(", ", newEnv.Errors.Select(e => e.Message)));
}

// After:
var result = env.EvaluateExpr(expr);
var errors = CollectAllErrors(result);
if (errors.Length > 0)
{
    Console.WriteLine(string.Join(", ", errors.Select(e => e.Message)));
}
```

**If you implement custom functions:**

```csharp
// Before:
var myFunc = FunctionValue.Create((env, call) =>
{
    var (env1, arg) = env.EvaluateExpr(call.Args[0]);
    return (env1, new ValueExpr(DoSomething(arg.Value)));
});

// After:
var myFunc = FunctionValue.Create((env, call) =>
{
    var arg = env.EvaluateExpr(call.Args[0]);
    return env.WithDeps(new ValueExpr(DoSomething(arg.Value)), new[] { arg }.ToImmutableArray());
});
```

**If you use WithVariables:**

```csharp
// Before:
var newEnv = env.WithVariables(("x", xExpr), ("y", yExpr));

// After:
var newEnv = env.NewScope(
    ImmutableDictionary<string, EvalExpr>.Empty
        .Add("x", xExpr)
        .Add("y", yExpr)
);
```

---

## Open Questions

1. **Partial evaluation caching**
   - Should PartialEvalEnvironment also have memoization?
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

The migration is straightforward but requires careful testing due to the pervasive nature of `EvaluateExpr()` throughout the codebase. A phased approach with parallel implementation minimizes risk.

**Recommendation: Proceed with refactor.** The benefits (simpler API, memoization, better error tracing) significantly outweigh the migration cost.
