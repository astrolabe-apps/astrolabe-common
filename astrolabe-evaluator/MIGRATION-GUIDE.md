# Migration Guide: Astrolabe Evaluator v6

This guide covers the API changes introduced in version 6 of the Astrolabe Evaluator library for both TypeScript (`astrolabe-evaluator`) and .NET (`Astrolabe.Evaluator`). Both platforms are now aligned at version 6.

## Overview

Version 6 introduces a redesigned evaluation architecture with:

1. **Simplified evaluation model** - No more `EnvValue<T>` tuples; functions return `EvalExpr` directly
2. **Unified EvalEnv abstract class** - Single base class with `BasicEvalEnv` and `PartialEvalEnv` implementations
3. **Lazy variable evaluation** - Variables are stored unevaluated and cached on first access
4. **Errors attached to ValueExpr** - Errors are now part of the result, not the environment
5. **New partial evaluation support** - Dedicated `PartialEvalEnv` for symbolic evaluation with uninlining

---

## TypeScript Changes

### Environment Creation

#### Before
```typescript
import { BasicEvalEnv, EvalEnvState, EvalData, emptyEnvState } from "astrolabe-evaluator";

// Create environment with state object
const state: EvalEnvState = {
  data: evalData,
  current: rootValue,
  localVars: {},
  parent: undefined,
  errors: [],
  compare: compareSignificantDigits(5)
};
const env = new BasicEvalEnv(state);
```

#### After (v6)
```typescript
import { basicEnv, partialEnv, createBasicEnv, createPartialEnv } from "astrolabe-evaluator";

// Simple creation with data
const env = basicEnv({ name: "John", age: 30 });

// Or with custom functions
const env = createBasicEnv(rootData, { ...defaultFunctions, customFunc: myFunc });

// For partial evaluation
const pEnv = partialEnv();  // No data
const pEnv = partialEnv({ x: 1 });  // With data
```

### Evaluation API

#### Before
```typescript
// Evaluation returned [EvalEnv, ValueExpr] tuple
const [newEnv, result] = env.evaluate(expr);

// Errors accumulated in environment
if (newEnv.errors.length > 0) {
  console.log("Errors:", newEnv.errors);
}

// Helper functions returned EnvValue tuples
function evaluateAll(e: EvalEnv, exprs: EvalExpr[]): EnvValue<ValueExpr[]> {
  return mapAllEnv(e, exprs, doEvaluate);
}
```

#### After (v6)
```typescript
// Evaluation returns EvalExpr directly
const result = env.evaluateExpr(expr);

// Check if fully evaluated
if (result.type === "value") {
  const valueResult = result as ValueExpr;
  // Access value directly
  console.log(valueResult.value);

  // Errors are attached to the ValueExpr
  if (valueResult.errors) {
    console.log("Errors:", valueResult.errors);
  }
}

// For full evaluation that must succeed
import { evaluate } from "astrolabe-evaluator";
const value = evaluate(env, expr); // Throws if not fully evaluated
```

### Creating Scopes

#### Before
```typescript
// withVariables evaluated immediately and returned new env
const newEnv = env.withVariables([["x", expr1], ["y", expr2]]);

// withCurrent changed the current data context
const envWithCurrent = env.withCurrent(newValue);
```

#### After (v6)
```typescript
// newScope stores unevaluated expressions, evaluated lazily on access
const newEnv = env.newScope({ x: expr1, y: expr2 });

// Current data is bound to the _ variable
const envWithData = env.newScope({ _: dataValue });
```

### Function Implementation

#### Before
```typescript
import { functionValue, EnvValue, mapEnv, evaluateAll } from "astrolabe-evaluator";

const myFunc = functionValue(
  (env, call) => {
    // Must return [EvalEnv, ValueExpr] tuple
    return mapEnv(evaluateAll(env, call.args), (args) => {
      return valueExpr(args[0].value + args[1].value);
    });
  },
  constGetType(NumberType)
);
```

#### After (v6)
```typescript
// Functions now return EvalExpr directly
function myFunc(env: EvalEnv, call: CallExpr): EvalExpr {
  const partials = call.args.map(arg => env.evaluateExpr(arg));

  // Check if all args are fully evaluated
  if (partials.every(p => p.type === "value")) {
    const args = partials as ValueExpr[];
    return valueExpr(args[0].value + args[1].value);
  }

  // Return symbolic call for partial evaluation
  return { ...call, args: partials };
}

// Wrap in ValueExpr for function table
const myFuncValue: ValueExpr = {
  type: "value",
  function: {
    eval: myFunc,
    getType: constGetType(NumberType)
  }
};
```

### Error Handling

#### Before
```typescript
// Errors accumulated in environment
const [newEnv, result] = env.evaluate(expr);
const errors = newEnv.errors;

// Add error to environment
const envWithError = env.withError("Something went wrong");
```

#### After (v6)
```typescript
import { valueExprWithError, collectAllErrors, hasErrors } from "astrolabe-evaluator";

// Return error in result
return valueExprWithError(null, "Something went wrong");

// Collect all errors from result and its dependencies
const errors = collectAllErrors(result);

// Check if any errors exist
if (hasErrors(result)) {
  // Handle error case
}
```

### Partial Evaluation & Uninlining

#### New in v6
```typescript
import { partialEnv, createPartialEnv, PartialEvalEnv } from "astrolabe-evaluator";

// Create partial evaluation environment
const env = partialEnv();

// Partially evaluate - unknown variables remain symbolic
const result = env.evaluateExpr(parseEval("$x + 1"));
// result is CallExpr: { type: "call", function: "+", args: [VarExpr("x"), ValueExpr(1)] }

// Uninline repeated expressions back to let bindings
const uninlined = (env as PartialEvalEnv).uninline(result, {
  complexityThreshold: 1,
  minOccurrences: 2
});
```

### Removed APIs

The following APIs have been removed:

- `EnvValue<T>` type alias
- `mapEnv`, `mapAllEnv`, `alterEnv` helper functions
- `EvalEnvState` interface
- `EvalData` interface
- `env.withError()` method
- `env.withCurrent()` method (use `newScope({ _: value })` instead)
- `env.withVariables()` method (use `newScope()` instead)
- `env.errors` property (errors are now in `ValueExpr.errors`)

---

## .NET Changes

### Environment Creation

#### Before
```csharp
using Astrolabe.Evaluator;

// Create with state object
var state = new EvalEnvironmentState(
    data,
    current,
    EvalEnvironment.DefaultComparison,
    ImmutableDictionary<string, EvalExpr>.Empty,
    null,
    []
);
var env = new EvalEnvironment(state);
```

#### After (v6)
```csharp
using Astrolabe.Evaluator;

// Simple creation with data
var env = EvalEnvFactory.BasicEnv(jsonData);

// Or with custom configuration
var env = EvalEnvFactory.CreateBasicEnv(
    root: jsonData,
    functions: customFunctions,
    compare: EvalEnv.CompareSignificantDigits(3)
);

// For partial evaluation
var pEnv = EvalEnvFactory.PartialEnv();
var pEnv = EvalEnvFactory.PartialEnv(jsonData);
```

### Evaluation API

#### Before
```csharp
// Evaluation returned tuple (EnvironmentValue<ValueExpr>)
var (newEnv, result) = env.Evaluate(expr);

// Access errors from environment
var errors = newEnv.Errors;
```

#### After (v6)
```csharp
// Evaluation returns EvalExpr directly
EvalExpr result = env.EvaluateExpr(expr);

// Check if fully evaluated
if (result is ValueExpr valueResult)
{
    // Access value directly
    var value = valueResult.Value;

    // Errors are attached to ValueExpr
    if (valueResult.Errors?.Any() == true)
    {
        foreach (var error in valueResult.Errors)
            Console.WriteLine(error);
    }
}
```

### Creating Scopes

#### Before
```csharp
// WithVariable/WithVariables evaluated immediately
var newEnv = env.WithVariable("x", expr);
var newEnv = env.WithVariables(new[] {
    KeyValuePair.Create("x", expr1),
    KeyValuePair.Create("y", expr2)
});

// WithCurrent changed data context
var envWithCurrent = env.WithCurrent(newValue);
```

#### After (v6)
```csharp
// NewScope stores unevaluated expressions, evaluated lazily
var newEnv = env.NewScope(new Dictionary<string, EvalExpr>
{
    ["x"] = expr1,
    ["y"] = expr2
});

// Current data bound to _ variable
var envWithData = env.NewScope(new Dictionary<string, EvalExpr> { ["_"] = dataValue });
```

### Function Implementation

#### Before
```csharp
// Functions used FunctionValue delegate returning EnvironmentValue
public delegate EnvironmentValue<ValueExpr> FunctionValue(EvalEnvironment env, CallExpr call);
```

#### After (v6)
```csharp
// Functions return EvalExpr directly via FunctionHandler delegate
public delegate EvalExpr FunctionHandler(EvalEnv env, CallExpr call);

// Example implementation
EvalExpr MyFunction(EvalEnv env, CallExpr call)
{
    var partials = call.Args.Select(arg => env.EvaluateExpr(arg)).ToList();

    // Check if all args are fully evaluated
    if (partials.All(p => p is ValueExpr))
    {
        var args = partials.Cast<ValueExpr>().ToList();
        return new ValueExpr(/* computed result */);
    }

    // Return symbolic call for partial evaluation
    return call.WithArgs(partials);
}

// Wrap in ValueExpr for function table
var myFuncExpr = new ValueExpr(new FunctionHandler(MyFunction));
```

### Error Handling

#### Before
```csharp
// Errors accumulated in environment state
var (newEnv, result) = env.Evaluate(expr);
var errors = newEnv.Errors;

// EvalError record type
public record EvalError(string Message, SourceLocation? Location = null);
```

#### After (v6)
```csharp
// Return error in result
return ValueExpr.WithError(null, "Something went wrong");

// Multiple errors
return ValueExpr.WithErrors(null, new[] { "Error 1", "Error 2" });

// Collect all errors from result and its dependencies
var errors = ValueExpr.CollectAllErrors(result);
```

### Partial Evaluation & Uninlining

#### New in v6
```csharp
using Astrolabe.Evaluator;

// Create partial evaluation environment
var env = EvalEnvFactory.PartialEnv();

// Partially evaluate - unknown variables remain symbolic
var result = env.EvaluateExpr(ParseEval.Parse("$x + 1"));
// result is CallExpr with args [VarExpr("x"), ValueExpr(1)]

// Uninline repeated expressions back to let bindings
if (env is PartialEvalEnv partialEnv)
{
    var uninlined = partialEnv.Uninline(result,
        complexityThreshold: 1,
        minOccurrences: 2);
}
```

### Key Type Changes

| Before | After (v6) |
|--------|------------|
| `EvalEnvironment` | `EvalEnv` (abstract base class) |
| `EvalEnvironmentState` | Removed (internal to implementations) |
| `EnvironmentValue<T>` | Removed (functions return `EvalExpr` directly) |
| `EvalData` | Removed (data bound to `_` variable) |
| `FunctionValue` delegate | `FunctionHandler` delegate |

### Removed Files (.NET)

- `Astrolabe.Evaluator/EvalEnvironment.cs` - Replaced by `EvalEnv.cs`, `BasicEvalEnv.cs`, `PartialEvalEnv.cs`
- `Astrolabe.Evaluator/Interpreter.cs` - Logic moved into `EvalEnv` implementations
- `Astrolabe.Evaluator/Functions/FilterFunctionHandler.cs` - Consolidated into `DefaultFunctions.cs`
- `Astrolabe.Evaluator/Functions/FirstFunctionHandler.cs` - Consolidated into `DefaultFunctions.cs`
- `Astrolabe.Evaluator/Functions/FlatMapFunctionHandler.cs` - Consolidated into `DefaultFunctions.cs`
- `Astrolabe.Evaluator/Functions/MapFunctionHandler.cs` - Consolidated into `DefaultFunctions.cs`

### New Files (.NET)

- `Astrolabe.Evaluator/EvalEnv.cs` - Abstract base class and factory methods
- `Astrolabe.Evaluator/BasicEvalEnv.cs` - Full evaluation implementation
- `Astrolabe.Evaluator/PartialEvalEnv.cs` - Partial evaluation with uninlining
- `Astrolabe.Evaluator/PartialEvaluation.cs` - Helper utilities for partial evaluation

---

## Common Migration Patterns

### Pattern 1: Simple Evaluation

**Before:**
```typescript
// TypeScript
const [env, result] = basicEnv(data).evaluate(expr);

// C#
var (env, result) = new EvalEnvironment(state).Evaluate(expr);
```

**After (v6):**
```typescript
// TypeScript
const result = basicEnv(data).evaluateExpr(expr);
if (result.type !== "value") throw new Error("Not fully evaluated");

// C#
var result = EvalEnvFactory.BasicEnv(data).EvaluateExpr(expr);
if (result is not ValueExpr valueResult) throw new Exception("Not fully evaluated");
```

### Pattern 2: Function with Error Handling

**Before:**
```typescript
// TypeScript
return mapEnv(evaluateAll(env, call.args), (args) => {
  if (args[0].value == null) {
    return [env.withError("Value is null"), NullExpr];
  }
  return valueExpr(compute(args));
});
```

**After (v6):**
```typescript
// TypeScript
const partials = call.args.map(arg => env.evaluateExpr(arg));
if (!partials.every(p => p.type === "value")) {
  return { ...call, args: partials };  // Partial evaluation
}
const args = partials as ValueExpr[];
if (args[0].value == null) {
  return valueExprWithError(null, "Value is null");
}
return valueExpr(compute(args));
```

### Pattern 3: Iterating with Current Value

**Before:**
```typescript
// TypeScript
for (const elem of array) {
  const [nextEnv, result] = env.withCurrent(elem).evaluate(expr);
  // ...
}
```

**After (v6):**
```typescript
// TypeScript
for (const elem of array) {
  const result = env.newScope({ _: elem }).evaluateExpr(expr);
  // ...
}
```

---

## Breaking Changes Summary

### TypeScript

1. `evaluate()` → `evaluateExpr()` (returns `EvalExpr`, not tuple)
2. `withVariables()` → `newScope()`
3. `withCurrent()` → `newScope({ _: value })`
4. `env.errors` → `collectAllErrors(result)`
5. Function handlers return `EvalExpr` directly, not `EnvValue<ValueExpr>`
6. `mapEnv`, `mapAllEnv`, `alterEnv` removed

### .NET

1. `EvalEnvironment` → `EvalEnv` (abstract) with `BasicEvalEnv`/`PartialEvalEnv`
2. `Evaluate()` → `EvaluateExpr()` (returns `EvalExpr`, not tuple)
3. `WithVariable()`/`WithVariables()` → `NewScope()`
4. `WithCurrent()` → `NewScope()` with `_` binding
5. `env.Errors` → `ValueExpr.CollectAllErrors(result)`
6. `FunctionValue` delegate → `FunctionHandler` delegate
7. `EnvironmentValue<T>` removed

---

## Benefits of the New Architecture

1. **Simpler function signatures** - No more tuple returns
2. **Unified error handling** - Errors travel with values, not environments
3. **Lazy evaluation** - Variables evaluated only when accessed
4. **Better partial evaluation** - First-class support for symbolic expressions
5. **Uninlining support** - Reconstruct let bindings for optimization
6. **Cleaner caching** - Per-scope memoization of variable evaluation
7. **TypeScript/C# parity** - Both implementations share the same architecture
