# Partial Evaluation by Default - Implementation Plan

## Overview

This document outlines the plan to update both C# (Astrolabe.Evaluator) and TypeScript (@astrolabe-evaluator) evaluators to support partial evaluation by default.

### Key Strategy: 100% Backward Compatible

**Zero breaking changes for existing code:**
- ✅ `evaluate()` / `Evaluate()` remains the main implementation (unchanged)
- ✅ New `evaluateExpr()` / `EvaluateExpr()` added as simple wrapper
- ✅ All existing tests pass without modification
- ✅ Only one cast needed in `defaultEvaluate` for compatibility
- ✅ Functions return `EvalExpr` type (most are `ValueExpr`, just typed as `EvalExpr`)
- ⚠️ Only `PartialEvalEnvironment` has breaking changes (OK - not released yet)

**Implementation approach:**
- Functions' `eval` return type changes from `ValueExpr` to `EvalExpr`
- Standard evaluation casts result back to `ValueExpr` (single line change)
- PartialEvalEnvironment implements `evaluateExpr()` for partial evaluation
- Existing code continues working exactly as before

> **Note on Line Numbers**: Line number references in this document are approximate and may drift as code evolves. Use them as general guidance to locate code sections. Function names and file paths are more reliable identifiers.

## Current Architecture

### Type Hierarchy

**C# (Astrolabe.Evaluator/EvalExpr.cs):**
- `EvalExpr` is an interface representing ANY expression (evaluated or unevaluated)
- `ValueExpr` is a record that implements `EvalExpr` - represents a fully evaluated value
- Other expression types: `LetExpr`, `PropertyExpr`, `LambdaExpr`, `CallExpr`, `ArrayExpr`, `VarExpr`

**TypeScript (astrolabe-evaluator/src/ast.ts):**
- `EvalExpr` is a union type of all expression types
- `ValueExpr` is one variant of the discriminated union
- Same expression types as C#

### Current Return Types

**C#:**
```csharp
// Current signature
public delegate EnvironmentValue<T> CallHandler<T>(EvalEnvironment environment, CallExpr callExpr);
public record FunctionHandler(CallHandler<ValueExpr> Evaluate);
public virtual EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr);
```

**TypeScript:**
```typescript
// Current signature
export interface FunctionValue {
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>;
}
abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;
```

### Existing Partial Evaluation

Both C# and TypeScript have separate `PartialEvaluator` utilities that:
- Use different algorithms for compile-time simplification
- Return `EvalExpr` (can be simplified but not necessarily fully evaluated)
- Are invoked separately from the main evaluation pipeline

### Current Helper Function Pattern

**C# FunctionHandler Helpers**

The C# implementation provides two key helper methods that wrap function implementations:

```csharp
// Evaluates all args to ValueExpr, passes List<ValueExpr> to your function
public static FunctionHandler DefaultEvalArgs(
    Func<EvalEnvironment, List<ValueExpr>, ValueExpr> eval
) =>
    new(
        (e, call) =>
            e.EvalSelect(call.Args, (e2, x) => e2.Evaluate(x))
                .Map(args => eval(e, args.ToList()))
    );

// Evaluates all args, extracts .Value primitives, passes List<object?> to your function
public static FunctionHandler DefaultEval(Func<EvalEnvironment, List<object?>, object?> eval) =>
    DefaultEvalArgs(
        (e, args) => ValueExpr.WithDeps(eval(e, args.Select(x => x.Value).ToList()), args)
    );

public static FunctionHandler DefaultEval(Func<IList<object?>, object?> eval) =>
    DefaultEval((_, a) => eval(a));
```

**How these work:**
1. `DefaultEvalArgs`: Evaluates all arguments using `env.Evaluate()`, then passes the resulting `List<ValueExpr>` to your function
2. `DefaultEval`: Additionally extracts the `.Value` property from each `ValueExpr`, passing primitive values to your function

**Why this prevents partial evaluation:**
- Both helpers **fully evaluate all arguments** before calling your function
- Your function only sees fully evaluated values (ValueExpr or primitives)
- Cannot return partial expressions when arguments contain unevaluated variables
- Functions using these helpers must be converted to manually evaluate arguments and check types

**TypeScript Helper Functions**

TypeScript uses composed evaluation patterns rather than wrapper helpers:

```typescript
// Evaluates all expressions to ValueExpr
export function evaluateAll(e: EvalEnv, expr: EvalExpr[]) {
  return mapAllEnv(e, expr, doEvaluate);
}

// Maps over an EnvValue result
export function mapEnv<A, B>(ev: EnvValue<A>, f: (a: A) => B): EnvValue<B> {
  return [ev[0], f(ev[1])];
}
```

**Common patterns that prevent partial evaluation:**
- `evaluateAll(env, args)` - Evaluates all args, assumes all become ValueExpr
- `binFunction(...)` - Uses evaluateAll, extracts `.value` from results
- `evalFunction(...)` - Uses evaluateAll, passes primitive values to callback
- `arrayFunc(...)` - Uses mapAllEnv with doEvaluate, assumes ValueExpr results

**Why these need updates:**
- Functions automatically evaluate all arguments before processing
- No type checking to handle cases where evaluation returns non-ValueExpr
- Cannot short-circuit or return partial expressions

## Design Decisions

Based on user requirements:

1. **Keep PartialEvaluator/PartialEvalEnvironment classes**
   - Different algorithms require separate implementations
   - Functions need to be aware that args might not be fully evaluated

2. **Default implementation still does full evaluation**
   - The default `EvalEnvironment` will continue to fully evaluate expressions
   - Returns `ValueExpr` (wrapped as `EvalExpr`)
   - Behavior remains the same for existing code

3. **Functions intelligently handle partial inputs**
   - Each function checks if inputs are fully evaluated (`ValueExpr`)
   - Returns partial results (unevaluated expressions) when inputs aren't fully evaluated
   - Provides clear patterns for function authors

4. **Fully backward compatible for standard evaluation**
   - Existing `evaluate()` method remains unchanged and is the main implementation
   - New `evaluateExpr()` method added as a wrapper (calls `evaluate()`)
   - Only `defaultEvaluate` needs one cast to maintain compatibility
   - Zero breaking changes - all existing tests pass without modification
   - PartialEvalEnvironment can break compatibility (not released yet)

## Architecture Differences: C# vs TypeScript

Understanding the architectural differences between the two implementations is crucial for the update strategy.

### C# Architecture

**Pattern: Wrapper Helpers**
- Uses `FunctionHandler.DefaultEval()` and `FunctionHandler.DefaultEvalArgs()` as wrapper functions
- These wrappers automatically evaluate all arguments before calling your function
- Functions receive either `List<ValueExpr>` (DefaultEvalArgs) or `List<object?>` (DefaultEval)
- Wrappers handle the boilerplate of evaluating all args in sequence

**Helper hierarchy:**
```
FunctionHandler (abstract base)
  ├─ DefaultEvalArgs: (env, args: List<ValueExpr>) => ValueExpr
  ├─ DefaultEval: (env, args: List<object?>) => object?
  └─ Custom implementations: (env, call: CallExpr) => EnvironmentValue<ValueExpr>
```

**Update strategy:**
- Modify DefaultEval/DefaultEvalArgs to return `EvalExpr` instead of `ValueExpr`
- Or replace usage with new helper that supports partial evaluation
- Helpers like `NumberOp`, `BinNullOp`, etc. build on top of DefaultEval

### TypeScript Architecture

**Pattern: Composed Evaluation**
- Uses composition of `evaluateAll()`, `mapEnv()`, `mapAllEnv()` functions
- No wrapper abstraction - functions explicitly call evaluation utilities
- Functions use factory helpers (binFunction, evalFunction, etc.) that compose evaluation
- More explicit control flow but more boilerplate

**Helper hierarchy:**
```
Factory Functions (create FunctionValue objects)
  ├─ binFunction: Creates binary operators
  ├─ evalFunction: Evaluates args, passes values to callback
  ├─ evalFunctionExpr: Evaluates args, passes ValueExpr to callback
  ├─ arrayFunc: Handles array/varargs functions
  └─ aggFunction: Aggregation operations
```

**Update strategy:**
- Update factory functions to check result types before extracting `.value`
- Add type guards to handle partial evaluation cases
- Functions manually evaluate, so add partial expression returns

### Key Differences

| Aspect | C# | TypeScript |
|--------|----|-----------|
| Abstraction | Wrappers (DefaultEval) | Composition (evaluateAll) |
| Evaluation | Implicit in wrapper | Explicit in function |
| Type handling | Pattern matching | Type narrowing |
| Boilerplate | Less (wrapper hides it) | More (explicit evaluation) |
| Flexibility | Less (wrapper controls) | More (direct control) |
| Update impact | Fix wrapper, functions inherit | Fix each factory/function |

### Implementation Implications

**C# Advantages:**
- Fixing wrapper helpers updates many functions automatically
- Less code duplication
- Consistent evaluation pattern

**C# Challenges:**
- Wrapper abstraction hides evaluation, harder to add partial support
- May need to replace wrappers entirely rather than modify

**TypeScript Advantages:**
- More explicit control, easier to add type checking
- Can selectively update functions
- Clearer what each function does

**TypeScript Challenges:**
- More functions need individual updates
- More code duplication
- Need to update multiple factory patterns

## Implementation Phases

### Phase 1: Core Type Changes

#### 1.1 C# Changes (Astrolabe.Evaluator)

**File: EvalExpr.cs**
- Update `FunctionHandler` delegate to return `EvalExpr`:
  ```csharp
  // OLD
  public delegate EnvironmentValue<T> CallHandler<T>(EvalEnvironment environment, CallExpr callExpr);
  public record FunctionHandler(CallHandler<ValueExpr> Evaluate);

  // NEW - Change ValueExpr to EvalExpr
  public delegate EnvironmentValue<T> CallHandler<T>(EvalEnvironment environment, CallExpr callExpr);
  public record FunctionHandler(CallHandler<EvalExpr> Evaluate);
  ```
- Update helper methods to return `EvalExpr`:
  ```csharp
  // OLD
  public static FunctionHandler DefaultEvalArgs(
      Func<EvalEnvironment, List<ValueExpr>, ValueExpr> eval
  )

  // NEW - Return EvalExpr
  public static FunctionHandler DefaultEvalArgs(
      Func<EvalEnvironment, List<ValueExpr>, EvalExpr> eval
  )
  ```

**File: EvalEnvironment.cs**
- Add new `EvaluateExpr()` method as a simple wrapper:
  ```csharp
  // NEW - Wrapper method that calls Evaluate() for API consistency
  public virtual EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr evalExpr)
  {
      return this.Evaluate(evalExpr);
  }
  ```
- Keep existing `Evaluate()` as the main implementation (UNCHANGED):
  ```csharp
  // EXISTING - Remains the main implementation, no changes needed
  public virtual EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
  {
      return this.DefaultEvaluate(evalExpr);
  }
  ```

**C# Backwards Compatibility:**
- `Evaluate()` remains the main implementation - NO changes to existing method
- `EvaluateExpr()` is a simple wrapper that calls `Evaluate()` and returns the result
- This provides API consistency while maintaining 100% backward compatibility

**File: Interpreter.cs**
- Update `DefaultEvaluate` to cast function result:
  ```csharp
  // In DefaultEvaluate, when handling CallExpr:
  case CallExpr ce:
      // ... existing code ...
      var (nextEnv, result) = handler.Evaluate(env, ce);

      // NEW - Cast result to ValueExpr for compatibility
      return (nextEnv, (ValueExpr)result);
  ```
- **NO other changes needed** - signature stays `EnvironmentValue<ValueExpr>`
- All existing switch cases remain unchanged

#### 1.2 TypeScript Changes (astrolabe-evaluator)

**File: ast.ts**
- Update `FunctionValue` interface to return `EvalExpr`:
  ```typescript
  // OLD
  export interface FunctionValue {
    eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>;
    getType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>;
  }

  // NEW
  export interface FunctionValue {
    eval: (env: EvalEnv, args: CallExpr) => EnvValue<EvalExpr>;
    getType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>;
  }
  ```
- Add new `evaluateExpr()` method as a simple wrapper:
  ```typescript
  // NEW - Wrapper method that calls evaluate() for API consistency
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
    return this.evaluate(expr);
  }
  ```
- Keep existing `evaluate()` as the main implementation (UNCHANGED):
  ```typescript
  // EXISTING - Remains the main implementation, no changes needed
  abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;
  ```

**TypeScript Backwards Compatibility:**
- `evaluate()` remains the main implementation - NO changes to existing method
- `evaluateExpr()` is a simple wrapper that calls `evaluate()` and returns the result
- This provides API consistency while maintaining 100% backward compatibility

**File: evaluate.ts**
- Update `defaultEvaluate` to cast function result:
  ```typescript
  // In defaultEvaluate function, when handling CallExpr:
  case "call": {
    // ... existing code ...
    const [nextEnv, result] = funcCall.function.eval(env, expr);

    // NEW - Cast result to ValueExpr for compatibility
    return [nextEnv, result as ValueExpr];
  }
  ```
- **NO other changes needed** - signature stays `EnvValue<ValueExpr>`
- All existing evaluation branches remain unchanged

### Phase 2: Helper Utilities (Optional)

Since the pattern for handling partial evaluation is straightforward, most helper utilities are not needed. Functions should:
1. Manually evaluate their arguments
2. Check if results are `ValueExpr`
3. Either perform the operation OR return a new `CallExpr` with partially evaluated args

**Optional C# Helper (if desired for consistency):**

For C#, pattern matching with `is` already works well, but you could add a simple type guard if preferred:

```csharp
// In EvalExpr.cs or as an extension method
public static bool IsValueExpr(this EvalExpr expr, out ValueExpr value)
{
    if (expr is ValueExpr v)
    {
        value = v;
        return true;
    }
    value = null!;
    return false;
}
```

**TypeScript:**

For TypeScript, the discriminated union works naturally with type guards:
```typescript
if (expr.type === 'value') {
  // TypeScript knows expr is ValueExpr here
}
```

No helper needed - the built-in type narrowing is sufficient.

### Phase 3: Update Function Implementations

Based on analysis of actual code, here are the specific changes needed.

**Summary of Work:**

| Language | Total Functions | Already Correct | Need Updates | Helper Functions to Fix |
|----------|----------------|-----------------|--------------|------------------------|
| C# | 47 | 18 (38%) | 29 (62%) | 10 helpers |
| TypeScript | 47 | 11 (23%) | 36 (77%) | ~9 factories |

**Key Implementation Patterns:**
- ✅ **Already Correct**: Functions that manually evaluate args and check types
- ⚠️ **Need Updates**: Functions using DefaultEval/DefaultEvalArgs or evaluateAll() patterns
- 🔧 **Helper Strategy**: Fix helper functions first, then dependent functions update automatically

#### 3.1 C# Helper Functions (DefaultFunctions.cs)

**Critical helpers that need updates** (these are used by many functions):

1. **`UnaryNullOp` (lines 33-43)** - Currently pattern matches on `{ } v1`, needs to check if result is `ValueExpr`
2. **`BinOp` (lines 45-54)** - Uses `DefaultEval`, needs manual evaluation with type checking
3. **`BinNullOp` (lines 56-67)** - Pattern matches on `[{ } v1, { } v2]`, needs type checking first
4. **`BoolOp` (lines 69-79)** - Uses `BinNullOp`, inherits same issues
5. **`NumberOp` (lines 81-96)** - Uses `BinNullOp`, inherits same issues
6. **`ComparisonFunc` (lines 98-101)** - Uses `BinNullOp`, inherits same issues
7. **`StringOp` (lines 121-124)** - Uses `DefaultEvalArgs` which assumes all args are `ValueExpr`
8. **`ArrayOp` (lines 126-139)** - Assumes results are `ValueExpr`
9. **`ArrayAggOp` (lines 141-152)** - Uses `ArrayOp`, inherits same issues
10. **`ShortCircuitBooleanOp` (lines 164-201)** - Helper for `and`/`or` operators, manually evaluates but used by functions in dictionary

**Example fix for `BinNullOp`:**
```csharp
public static FunctionHandler BinNullOp(Func<EvalEnvironment, object, object, object?> evaluate)
{
    return new FunctionHandler((env, call) =>
    {
        if (call.Args.Count != 2)
            return env.WithError("Wrong number of args").WithNull();

        // Use EvaluateExpr to support partial evaluation
        var (env1, arg1) = env.EvaluateExpr(call.Args[0]);
        var (env2, arg2) = env1.EvaluateExpr(call.Args[1]);

        // If either arg is ValueExpr with null, can return null immediately
        if (arg1 is ValueExpr v1 && v1.Value == null)
            return env2.WithValue(ValueExpr.WithDeps(null, [v1, arg2 is ValueExpr v2 ? v2 : ValueExpr.Null]));
        if (arg2 is ValueExpr v2b && v2b.Value == null)
            return env2.WithValue(ValueExpr.WithDeps(null, [arg1 is ValueExpr v1b ? v1b : ValueExpr.Null, v2b]));

        // Check if both are ValueExpr with non-null values
        if (arg1 is not ValueExpr val1 || arg2 is not ValueExpr val2)
            return env2.WithValue(new CallExpr(call.Function, new[] { arg1, arg2 })); // Return CallExpr with partially evaluated args

        // Both are non-null ValueExpr, perform operation
        return env2.WithValue(new ValueExpr(evaluate(env2, val1.Value!, val2.Value!)));
    });
}
```

**Key insight:** Operations that return `null` when any input is `null` can short-circuit - they don't need all arguments to be fully evaluated, just need to check if any evaluated argument is a `null` ValueExpr.

**Functions that already handle partial evaluation correctly:**
- ✅ `IfElseOp` (lines 103-119) - Manually evaluates, checks value
- ✅ `WhichFunction` (lines 296-334) - Manually evaluates
- ✅ `ElemFunctionHandler` (lines 200-236) - Manually evaluates
- ✅ `KeysOrValuesFunctionHandler` (lines 238-271) - Manually evaluates
- ✅ Short-circuit AND/OR (lines 162-198) - Could return partial when hitting unevaluated arg
- ✅ `FirstFunctionHandler`, `FilterFunctionHandler`, `MapFunctionHandler`, `FlatMapFunctionHandler` (separate files)
- ✅ `merge` (lines 502-536) - Manually evaluates each argument, checks for null

**Functions that will break** (use the helpers above):
- `"+"`, `"-"`, `"*"`, `"/"`, `"%"` - Use `NumberOp`
- `"="`, `"!="`, `"<"`, `"<="`, `">"`, `">="` - Use `ComparisonFunc`
- `"!"` - Uses `UnaryNullOp`
- `"??"` - Uses `DefaultEvalArgs`
- `"sum"`, `"min"`, `"max"` - Use `ArrayAggOp`
- `"count"` - Uses `ArrayOp`
- `"array"`, `"notEmpty"`, `"fixed"` - Use `DefaultEval`
- `"string"`, `"lower"`, `"upper"` - Use `StringOp`
- `"object"` - Uses `DefaultEvalArgs`

**Total: 10 helper functions + 47 total functions in dictionary**
- 18 functions already handle partial evaluation correctly
- 19 functions need conversion from DefaultEval to DefaultEvalArgs pattern
- 10 functions already use DefaultEvalArgs (need minor updates for type checking)

#### 3.2 TypeScript Helper Functions (defaultFunctions.ts)

**Critical helpers that need updates:**

1. **`binFunction` (lines 95-109)** - Calls `evaluateAll()` expecting `ValueExpr[]`
2. **`evalFunction` (lines 131-139)** - Uses `evaluateAll()` and assumes `ValueExpr[]`
3. **`evalFunctionExpr` (lines 141-149)** - Uses `evaluateAll()` expecting `ValueExpr[]`
4. **`arrayFunc` (lines 151-164)** - Uses `mapAllEnv()` expecting `ValueExpr[]`
5. **`aggFunction` (lines 166-177)** - Uses `arrayFunc`, accesses `.value` directly
6. **`stringFunction` (lines 51-57)** - Uses `evaluateAll()`

**Example fix for `binFunction`:**
```typescript
export function binFunction(
  func: (a: any, b: any, e: EvalEnv) => unknown,
  returnType: GetReturnType,
  name?: string,
): ValueExpr {
  return binEvalFunction(name ?? "_", returnType, (aE, bE, env) => {
    const [env1, a] = env.evaluate(aE);
    const [env2, b] = env1.evaluate(bE);

    // If either arg is ValueExpr with null, can return null immediately
    if (a.type === 'value' && a.value == null)
      return [env2, valueExprWithDeps(null, [a, b.type === 'value' ? b : valueExpr(null)])];
    if (b.type === 'value' && b.value == null)
      return [env2, valueExprWithDeps(null, [a.type === 'value' ? a : valueExpr(null), b])];

    // Check if both are ValueExpr with non-null values
    if (a.type !== 'value' || b.type !== 'value') {
      return [env2, { type: 'call', function: name ?? '_', args: [a, b] }];
    }

    // Both are non-null ValueExpr, perform operation
    return [env2, valueExprWithDeps(func(a.value, b.value, env2), [a, b])];
  });
}
```

**Key insight:** Same as C# - operations that return `null` when any input is `null` can short-circuit without needing all arguments to be fully evaluated.

**Functions that already handle partial evaluation correctly:**
- ✅ `whichFunction` (lines 179-205) - Manually evaluates
- ✅ `mapFunction` (lines 207-227) - Manually evaluates array first
- ✅ `flatmapFunction` (lines 229-264) - Manually evaluates
- ✅ `firstFunction` (lines 266-308) - Manually evaluates
- ✅ `filterFunction` (lines 310-448) - Manually evaluates
- ✅ `condFunction` (lines 450-474) - Checks condition value, could return partial
- ✅ `elemFunction` (lines 476-518) - Manually evaluates
- ✅ `keysOrValuesFunction` (lines 520-554) - Manually evaluates
- ✅ `andFunction`, `orFunction` (lines 600-611) - Could return partial
- ✅ `merge` (lines 716-741) - Manually evaluates each argument, checks for null

**Functions that will break** (use the helpers above):
- `"+"`, `"-"`, `"*"`, `"/"`, `"%"` (lines 621-625) - Use `binFunction`
- `">"`, `"<"`, `"<="`, `">="`, `"="`, `"!="` (lines 626-631) - Use `compareFunction` → `binFunction`
- `"!"` (lines 615-618) - Uses `evalFunction`
- `"??"` (lines 632-648) - Uses `evalFunctionExpr`
- `"array"` (line 649) - Uses `flatFunction` → `mapAllEnv`
- `"string"`, `"lower"`, `"upper"` (lines 650-652) - Use `stringFunction` → `evaluateAll`
- `"sum"`, `"min"`, `"max"` (lines 678-690) - Use `aggFunction`
- `"count"` (line 682) - Uses `arrayFunc`
- `"notEmpty"` (lines 691-694) - Uses `evalFunction`
- `"fixed"` (lines 698-704) - Uses `evalFunction`
- `"object"` (line 696) - Uses `objectFunction` → `evaluateAll`

**Total: 9 factory helpers + 47 total functions in defaultFunctions export**
- 11 functions already handle partial evaluation correctly
- 36 functions need updates to support partial evaluation
- Main work is converting helper patterns (binFunction, evalFunction, etc.)

#### 3.3 Update Strategy

**Recommended approach:**

1. **Fix the helper functions first** - This will cascade to many individual functions
2. **Update `evaluateAll()` and related utilities** to check types and return partial when needed
3. **Keep the pattern:** Manually evaluate arguments → Check if `ValueExpr` → Return partial `CallExpr` if not → Perform operation if all are values

**Key insight:** Many complex functions (map, filter, flatmap, which, cond) already manually evaluate and just need minor adjustments to check types before assuming `ValueExpr`.

### Phase 4: Update PartialEvalEnvironment

**Breaking changes OK** - PartialEvalEnvironment is not released yet, so we can change its API.

Both partial evaluation environments need to implement `evaluateExpr()` as the main method and have `evaluate()` throw an error.

#### 4.1 C# PartialEvalEnvironment

**File: PartialEvalEnvironment.cs**

```csharp
// Override EvaluateExpr - main implementation for partial evaluation
public override EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr evalExpr)
{
    switch (evalExpr)
    {
        case ValueExpr ve:
            return this.WithValue(ve);
        case CallExpr ce when ce.Args.All(arg => arg is ValueExpr):
            // Can fully evaluate when all args are values
            var (env, result) = this.DefaultEvaluate(ce);
            return (env, (ValueExpr)result); // Cast from base implementation
        default:
            throw new InvalidOperationException(
                "PartialEvalEnvironment.EvaluateExpr only accepts ValueExpr or CallExpr with all ValueExpr arguments."
            );
    }
}

// Override Evaluate() to throw error - partial eval should use EvaluateExpr
public override EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
{
    throw new InvalidOperationException(
        "Use EvaluateExpr() for partial evaluation. " +
        "Evaluate() is only for standard full evaluation."
    );
}
```

#### 4.2 TypeScript PartialEvalEnvironment

**File: partialEvaluator.ts**

```typescript
export class PartialEvalEnvironment extends EvalEnv {
  // Override evaluateExpr - main implementation for partial evaluation
  evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
    if (expr.type === "value") {
      return [this, expr];
    }
    if (expr.type === "call" && expr.args.every((arg) => arg.type === 'value')) {
      // Can fully evaluate when all args are values
      const [env, result] = defaultEvaluate(this, expr);
      return [env, result]; // Already returns ValueExpr
    }
    throw new Error(
      "PartialEvalEnvironment.evaluateExpr only accepts ValueExpr or CallExpr with all ValueExpr arguments."
    );
  }

  // Override evaluate() to throw error - partial eval should use evaluateExpr
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    throw new Error(
      "Use evaluateExpr() for partial evaluation. " +
      "evaluate() is only for standard full evaluation."
    );
  }
  // ...
}
```

### Phase 5: Update Consumers and Tests

**Great News: NO consumer updates needed!**

Because we maintained backward compatibility by keeping `evaluate()` as the main implementation, existing code continues to work without any changes.

#### 5.1 C# Consumers - No Changes Required

**Existing code continues to work:**
```csharp
// This code works exactly as before - NO changes needed
var result = env.Evaluate(expr);
var value = result.Value.GetNumber();
```

**Files that DON'T need updates:**
- ✅ Test files in `Astrolabe.Evaluator.Tests/` - All pass unchanged
- ✅ Application code using the evaluator - Works as-is
- ✅ Example/demo code - No modifications needed

**Only PartialEvalEnvironment consumers need changes:**
- Change `Evaluate()` → `EvaluateExpr()` when using PartialEvalEnvironment
- This is OK because PartialEvalEnvironment is not released yet

#### 5.2 TypeScript Consumers - No Changes Required

**Existing code continues to work:**
```typescript
// This code works exactly as before - NO changes needed
const [env, result] = env.evaluate(expr);
const value = getNumber(result);
```

**Files that DON'T need updates:**
- ✅ Test files in `astrolabe-evaluator/test/` - All pass unchanged
- ✅ Components in `astrolabe-storybook/` - Work as-is
- ✅ Application code using the evaluator - No modifications needed

**Only PartialEvalEnvironment consumers need changes:**
- Change `evaluate()` → `evaluateExpr()` when using PartialEvalEnvironment
- This is OK because PartialEvalEnvironment is not released yet

### Phase 6: Testing

#### 6.1 C# Tests

**Run existing tests:**
```bash
cd /home/doolse/astrolabe/astrolabe-common
dotnet test Astrolabe.Evaluator.Tests/
```

**Add new test cases for partial evaluation:**
```csharp
[Fact]
public void Evaluate_WithUnknownVariable_ReturnsPartialExpression()
{
    var env = new BasicEvalEnvironment();
    var expr = new VarExpr("unknown");

    var result = env.Evaluate(expr);

    Assert.IsNotType<ValueExpr>(result.Value);
    Assert.IsType<VarExpr>(result.Value);
}

[Fact]
public void FunctionCall_WithPartialArgs_ReturnsPartialExpression()
{
    var env = new BasicEvalEnvironment()
        .WithFunction("add", AddFunction);

    var expr = new CallExpr(
        "add",
        new[] { new ValueExpr(5), new VarExpr("unknown") }
    );

    var result = env.Evaluate(expr);

    Assert.IsNotType<ValueExpr>(result.Value);
    Assert.IsType<CallExpr>(result.Value);
}
```

#### 6.2 TypeScript Tests

**Run existing tests:**
```bash
cd /home/doolse/astrolabe/astrolabe-common/Astrolabe.TestTemplate/ClientApp
rushx test --filter "evaluator"
```

**Add new test cases for partial evaluation:**
```typescript
test('evaluate with unknown variable returns partial expression', () => {
  const env = new BasicEvalEnv();
  const expr: VarExpr = { type: 'var', name: 'unknown' };

  const [_, result] = env.evaluate(expr);

  expect(result.type).not.toBe('value');
  expect(result.type).toBe('var');
});

test('function call with partial args returns partial expression', () => {
  const env = new BasicEvalEnv()
    .withFunction('add', addFunction);

  const expr: CallExpr = {
    type: 'call',
    function: 'add',
    args: [
      makeValue(5),
      { type: 'var', name: 'unknown' }
    ]
  };

  const [_, result] = env.evaluate(expr);

  expect(result.type).not.toBe('value');
  expect(result.type).toBe('call');
});
```

## Implementation Order

Recommended order to minimize compilation errors:

1. **Phase 2: Helper Utilities** (add new code first)
   - Add helper functions in both C# and TypeScript
   - Doesn't break existing code

2. **Phase 1: Core Type Changes**
   - C# type signature changes
   - TypeScript type signature changes
   - This will cause compilation errors in existing code

3. **Phase 3: Function Implementations**
   - Update all function handlers to use helpers
   - Fix compilation errors from Phase 1

4. **Phase 4: PartialEvalEnvironment**
   - Update to match new signatures
   - Relatively isolated change

5. **Phase 5: Update Consumers**
   - Fix remaining compilation errors
   - Update application code

6. **Phase 6: Testing**
   - Run existing tests and fix failures
   - Add new test cases for partial evaluation

## Migration Notes

### For Existing Code - No Changes Required!

**Great news:** Existing code using the evaluator requires **zero changes**:

- ✅ All existing calls to `evaluate()` / `Evaluate()` continue working
- ✅ All existing tests pass without modification
- ✅ Standard evaluation behavior unchanged
- ✅ No breaking changes for consumers

**Only change needed:** If using `PartialEvalEnvironment` (not released), switch from `evaluate()` to `evaluateExpr()`.

### For Function Authors

When writing NEW functions that support partial evaluation, follow this pattern:

**C#:**
```csharp
public static FunctionHandler MyFunction = new FunctionHandler(
    (env, call) =>
    {
        // Evaluate arguments
        var (env1, arg1) = env.Evaluate(call.Args[0]);
        var (env2, arg2) = env1.Evaluate(call.Args[1]);

        // Check if both are ValueExpr
        if (arg1 is ValueExpr v1 && arg2 is ValueExpr v2)
        {
            // Work with fully evaluated values
            var result = DoSomething(v1.Value, v2.Value);
            return env2.WithValue(new ValueExpr(result));
        }

        // Return partially evaluated CallExpr
        return env2.WithValue(new CallExpr(call.Function, new[] { arg1, arg2 }));
    }
);
```

**TypeScript:**
```typescript
export const myFunction: FunctionValue = {
  eval: (env, call) => {
    // Evaluate arguments
    const [env1, arg1] = env.evaluate(call.args[0]);
    const [env2, arg2] = env1.evaluate(call.args[1]);

    // Check if both are ValueExpr
    if (arg1.type === 'value' && arg2.type === 'value') {
      // Work with fully evaluated values
      const result = doSomething(arg1.value, arg2.value);
      return [env2, valueExpr(result)];
    }

    // Return partially evaluated CallExpr
    return [env2, { type: 'call', function: call.function, args: [arg1, arg2] }];
  },
  // ...
};
```

### Backward Compatibility

**Strategy: 100% Backward Compatible - Zero Breaking Changes**

The implementation maintains full backward compatibility. Existing code requires **no changes** and all tests pass unchanged.

**C#:**
- `Evaluate(expr)` → Returns `EnvironmentValue<ValueExpr>` (MAIN - unchanged, fully compatible)
- `EvaluateExpr(expr)` → Returns `EnvironmentValue<EvalExpr>` (NEW - simple wrapper calling Evaluate)

**TypeScript:**
- `evaluate(expr)` → Returns `EnvValue<ValueExpr>` (MAIN - unchanged, fully compatible)
- `evaluateExpr(expr)` → Returns `EnvValue<EvalExpr>` (NEW - simple wrapper calling evaluate)

**Standard EvalEnv Implementation:**
```typescript
// TypeScript - evaluate() remains main implementation (UNCHANGED)
abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;

// evaluateExpr() is simple wrapper for API consistency
evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
  return this.evaluate(expr);
}
```

**C# Implementation:**
```csharp
// C# - Evaluate() remains main implementation (UNCHANGED)
public virtual EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
{
    return this.DefaultEvaluate(evalExpr);
}

// EvaluateExpr() is simple wrapper for API consistency
public virtual EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr evalExpr)
{
    return this.Evaluate(evalExpr);
}
```

**PartialEvalEnvironment (Breaking Changes OK - Not Released):**
```typescript
// PartialEvalEnvironment uses evaluateExpr() as main implementation
evaluateExpr(expr: EvalExpr): EnvValue<EvalExpr> {
  // Implementation for partial evaluation
}

// evaluate() throws error for partial eval environment
evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
  throw new Error("Use evaluateExpr() for partial evaluation");
}
```

**Key Implementation Detail:**
Only one change needed in `defaultEvaluate` (or `DefaultEvaluate` in C#):
```typescript
// In defaultEvaluate, when handling CallExpr:
const [nextEnv, result] = funcCall.function.eval(env, expr);
return [nextEnv, result as ValueExpr]; // Cast result for compatibility
```

**Runtime Behavior:**
- ✅ Default `EvalEnvironment` still fully evaluates expressions (returns `ValueExpr`)
- ✅ All existing code works without modification
- ✅ All existing tests pass unchanged
- ✅ Functions return `EvalExpr` (most are `ValueExpr`, just typed as `EvalExpr`)
- ✅ Single cast in `defaultEvaluate` maintains compatibility
- ⚠️ Only `PartialEvalEnvironment` has breaking changes (OK - not released)

**No Migration Needed:**
- Existing code continues working exactly as before
- No consumer updates required
- No test modifications needed
- Only PartialEvalEnvironment usage changes (from `evaluate` → `evaluateExpr`)

## Success Criteria

**Backward Compatibility (Must Have):**
- [ ] All existing C# tests pass without modification
- [ ] All existing TypeScript tests pass without modification
- [ ] Default evaluation behavior unchanged (still fully evaluates to `ValueExpr`)
- [ ] Zero breaking changes for existing consumers
- [ ] No runtime performance regression

**New Functionality (Must Have):**
- [ ] Functions can return `EvalExpr` (typed but still `ValueExpr` for most)
- [ ] PartialEvalEnvironment supports partial evaluation via `evaluateExpr()`
- [ ] Single cast in `defaultEvaluate` maintains compatibility
- [ ] `evaluateExpr()` wrapper method available on `EvalEnv`

**Code Quality (Should Have):**
- [ ] Helper utilities updated to support partial evaluation
- [ ] Clear patterns for function authors in documentation
- [ ] Existing `PartialEvaluator` classes still work

## References

- C# Evaluator: `/home/doolse/astrolabe/astrolabe-common/Astrolabe.Evaluator/`
- TypeScript Evaluator: `/home/doolse/astrolabe/astrolabe-common/astrolabe-evaluator/`
- Existing partial evaluator: `PartialEvaluator.cs` and `partialEvaluator.ts`