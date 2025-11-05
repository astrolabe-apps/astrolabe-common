# Partial Evaluator Implementation Plan

## Overview

Create a partial evaluator for both .NET and TypeScript implementations of Astrolabe.Evaluator that simplifies expressions by evaluating compile-time known values while preserving runtime expressions.

## User Requirements

**Goal:** Implement a partial evaluator with a "compile-time" variable (e.g., `$vv`) that can be used to resolve and simplify expressions.

**Example:**
```
Expression: $vv.length > 20 ? field1 + field2 : field3 + $vv.other
Given: $vv = { "length": 19, "other": 40 }
Result: field3 + 40
```

**Design Decisions:**
- ✅ Implement in **both .NET and TypeScript**
- ✅ Return **simplified EvalExpr AST** (not string)
- ✅ `$vv` is a **regular variable** (not special syntax)
- ✅ **Keep PropertyExpr** for unknown runtime fields

## Architecture

### Core Strategy

The partial evaluator will walk the expression tree and attempt to evaluate each node:

1. **Evaluatable nodes** (values known at compile-time) → convert to `ValueExpr`
2. **Non-evaluatable nodes** (runtime dependencies) → recursively simplify children and reconstruct

This creates a hybrid tree containing both evaluated values and unevaluated expressions.

### Algorithm by Expression Type

| Expression Type | Partial Evaluation Strategy |
|----------------|----------------------------|
| `ValueExpr` | Return as-is (already a constant) |
| `VarExpr` | Look up in environment: if found → `ValueExpr`, else keep as `VarExpr` |
| `PropertyExpr` | **Try to evaluate**: if succeeds → `ValueExpr`, else keep as `PropertyExpr` (unknown runtime field) |
| `CallExpr` (ternary `? :`) | Evaluate condition; if known → pick branch and simplify it; else simplify all three parts |
| `CallExpr` (binary ops: `+`, `>`, etc.) | Simplify both operands; if both are `ValueExpr` → evaluate; else reconstruct |
| `CallExpr` (other functions) | Simplify arguments; try to evaluate if all args are `ValueExpr`; else reconstruct |
| `ArrayExpr` | Simplify all elements; if all are `ValueExpr` → evaluate to `ArrayValue`; else reconstruct |
| `LetExpr` | Extend environment with bindings (partially evaluate them), then simplify body |
| `LambdaExpr` | **Partially evaluate the body** (lambda param is unknown), reconstruct lambda with simplified body |

### Example Walkthrough

```
Input: $vv.length > 20 ? field1 + field2 : field3 + $vv.other
Environment: { $vv: { length: 19, other: 40 } }

Step-by-step:
1. Node: CallExpr("?", [condition, trueBranch, falseBranch])

2. Partial eval condition: CallExpr(">", [$vv.length, 20])
   a. Partial eval $vv.length:
      - VarExpr("vv") → look up in env → ValueExpr({ length: 19, other: 40 })
      - PropertyExpr("length") applied → ValueExpr(19)
   b. Partial eval 20 → ValueExpr(20)
   c. Both operands are ValueExpr → evaluate > → ValueExpr(false)

3. Condition is ValueExpr(false) → pick falseBranch only

4. Partial eval falseBranch: CallExpr("+", [field3, $vv.other])
   a. Partial eval field3 → PropertyExpr("field3") (no value in env, keep as-is)
   b. Partial eval $vv.other → ValueExpr(40)
   c. Left operand is PropertyExpr (not fully known) → reconstruct
      CallExpr("+", [PropertyExpr("field3"), ValueExpr(40)])

Result: CallExpr("+", [PropertyExpr("field3"), ValueExpr(40)])
String representation: "field3 + 40"
```

## Implementation Plan

### Files to Create

#### .NET Implementation

**New file:** `Astrolabe.Evaluator/PartialEvaluator.cs`
```csharp
namespace Astrolabe.Evaluator;

public static class PartialEvaluator
{
    /// <summary>
    /// Partially evaluates an expression given an environment with known values.
    /// Returns a simplified expression tree with compile-time values substituted.
    /// </summary>
    public static EvalExpr PartialEvaluate(this EvalEnvironment env, EvalExpr expr)
    {
        // Main entry point
    }

    private static EvalExpr PartialEvaluateExpr(EvalEnvironment env, EvalExpr expr)
    {
        // Pattern match on expression type and apply strategy
    }
}
```

**New file:** `Astrolabe.Evaluator.Tests/PartialEvaluatorTests.cs`
```csharp
namespace Astrolabe.Evaluator.Tests;

public class PartialEvaluatorTests
{
    // Test cases for each scenario
}
```

#### TypeScript Implementation

**New file:** `astrolabe-evaluator/src/partialEvaluator.ts`
```typescript
import { EvalEnvironment, EvalExpr } from './evalExpr';

/**
 * Partially evaluates an expression given an environment with known values.
 * Returns a simplified expression tree with compile-time values substituted.
 */
export function partialEvaluate(env: EvalEnvironment, expr: EvalExpr): EvalExpr {
    // Main entry point
}

function partialEvaluateExpr(env: EvalEnvironment, expr: EvalExpr): EvalExpr {
    // Pattern match on expression type and apply strategy
}
```

**New file:** `astrolabe-evaluator/src/partialEvaluator.test.ts`
```typescript
import { describe, it, expect } from '@jest/globals';
import { partialEvaluate } from './partialEvaluator';

describe('partialEvaluate', () => {
    // Test cases
});
```

### Environment Setup: PartialEvalEnvironment Subclass

**Key Issue:** We need to:
1. Distinguish between compile-time values (variables like `$vv`) and runtime fields (`field1`, `field3`)
2. Check if something is defined without using exceptions
3. Still be able to call `FunctionHandler`s when all arguments are `ValueExpr`

**Solution:** Create a `PartialEvalEnvironment` subclass:

```csharp
public class PartialEvalEnvironment : EvalEnvironment
{
    public PartialEvalEnvironment(EvalEnvironmentState state) : base(state) { }

    // Override Evaluate to only accept fully-evaluated ValueExpr
    public override EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
    {
        if (evalExpr is ValueExpr ve)
        {
            return this.WithValue(ve);
        }

        throw new InvalidOperationException(
            "PartialEvalEnvironment.Evaluate only accepts ValueExpr. " +
            "Use PartialEvaluator methods for partial evaluation."
        );
    }

    // Helper: Check if a variable is defined (compile-time value)
    public bool HasVariable(string name)
    {
        var current = this;
        while (current != null)
        {
            if (current.State.LocalVariables.ContainsKey(name))
                return true;
            current = current.State.Parent as PartialEvalEnvironment;
        }
        return false;
    }

    // Helper: Check if there is any data context (for PropertyExpr evaluation)
    public bool HasDataContext()
    {
        var current = State.Current;
        // If current value is Undefined or null, there's no data context
        return current.Value is not Undefined and not null;
    }

    // Helper: Try to get a variable value if it exists
    public ValueExpr? TryGetVariable(string name)
    {
        var current = this;
        while (current != null)
        {
            if (current.State.LocalVariables.TryGetValue(name, out var expr) && expr is ValueExpr ve)
                return ve;
            current = current.State.Parent as PartialEvalEnvironment;
        }
        return null;
    }
}
```

**Usage:**

```csharp
// Create partial eval environment with compile-time values
var compileTimeVars = new Dictionary<string, EvalExpr>
{
    ["vv"] = new ValueExpr(new ObjectValue(new Dictionary<string, ValueExpr>
    {
        ["length"] = new ValueExpr(19),
        ["other"] = new ValueExpr(40)
    }))
};

var partialEnv = new PartialEvalEnvironment(
    new EvalEnvironmentState(
        Data: new EvalData(
            data: new ObjectValue(new Dictionary<string, ValueExpr>()), // Empty root
            getProperty: _ => new ValueExpr(Undefined.Instance) // Returns undefined for unknown props
        ),
        Current: new ValueExpr(Undefined.Instance),
        Compare: defaultCompare,
        LocalVariables: compileTimeVars.ToImmutableDictionary(),
        Parent: null,
        Errors: ImmutableList<EvalError>.Empty
    )
);
```

**How it works:**
1. Compile-time values stored as variables in `LocalVariables`
2. Root data is empty/undefined
3. Before evaluating, use `HasVariable()` or `HasProperty()` to check if defined
4. Only call `Evaluate()` on the environment when passing to `FunctionHandler`s with fully-evaluated `ValueExpr` arguments
5. No exceptions for control flow - explicit checks instead

### Detailed Implementation Logic

#### Helper: Is Expression Fully Evaluated?

```csharp
private static bool IsFullyEvaluated(EvalExpr expr)
{
    return expr is ValueExpr;
}
```

#### Main Pattern Matching Logic (.NET)

```csharp
private static EvalExpr PartialEvaluateExpr(EvalEnvironment env, EvalExpr expr)
{
    return expr switch
    {
        // Already a value - return as-is
        ValueExpr v => v,

        // Variable - try to resolve
        VarExpr ve => TryEvaluate(env, ve),

        // Property access - try to evaluate, keep as-is if it fails
        PropertyExpr pe => TryEvaluate(env, pe),

        // Function call - check for special cases
        CallExpr { Function: "?" } ce => PartialEvaluateTernary(env, ce),
        CallExpr ce => PartialEvaluateCall(env, ce),

        // Array literal
        ArrayExpr ae => PartialEvaluateArray(env, ae),

        // Let binding
        LetExpr le => PartialEvaluateLet(env, le),

        // Lambda - partially evaluate the body
        LambdaExpr lambda => PartialEvaluateLambda(env, lambda),

        _ => expr
    };
}
```

#### Variable Evaluation

```csharp
private static EvalExpr PartialEvaluateVar(PartialEvalEnvironment env, VarExpr varExpr)
{
    // Check if variable exists and get its value
    var value = env.TryGetVariable(varExpr.Name);
    if (value != null)
    {
        // Variable is defined with a compile-time value
        // Update the current context to this value for subsequent property access
        return value;
    }

    // Variable not found - keep as VarExpr (will be runtime value)
    return varExpr;
}
```

#### Property Evaluation

```csharp
private static EvalExpr PartialEvaluateProperty(PartialEvalEnvironment env, PropertyExpr propExpr)
{
    // Check if there's any data context at all
    if (!env.HasDataContext())
    {
        // No data context - this is a runtime field
        return propExpr;
    }

    // There's data context - evaluate the property access
    // (will return null/undefined if property doesn't exist, which is fine)
    var current = env.State.Current;

    if (current.Value is ObjectValue ov)
    {
        // Try to get the property value
        if (ov.Properties.TryGetValue(propExpr.Property, out var propValue))
        {
            return propValue;
        }
        // Property doesn't exist - return null/undefined ValueExpr
        return new ValueExpr(null);
    }

    // Current value is not an object - can't access property
    return new ValueExpr(null);
}
```

**How this works:**
- For `VarExpr("vv")`: calls `TryGetVariable("vv")` → if found, returns the `ValueExpr` value, else keeps `VarExpr`
- For `PropertyExpr("field1")`: calls `HasDataContext()` on root context → returns false (context is Undefined) → keeps `PropertyExpr`
- For `PropertyExpr("length")` when context is `$vv` object: `HasDataContext()` returns true → accesses property → returns `ValueExpr(19)`
- For `PropertyExpr("nonexistent")` when context is `$vv` object: `HasDataContext()` returns true → property doesn't exist → returns `ValueExpr(null)`
- **No exceptions** - pure checks and lookups

#### Ternary Operator

```csharp
private static EvalExpr PartialEvaluateTernary(EvalEnvironment env, CallExpr ce)
{
    // ce.Args = [condition, trueBranch, falseBranch]
    var condition = PartialEvaluateExpr(env, ce.Args[0]);

    if (condition is ValueExpr condValue)
    {
        // Condition is known - pick the appropriate branch
        bool isTrue = /* evaluate condValue as boolean */;
        var selectedBranch = isTrue ? ce.Args[1] : ce.Args[2];
        return PartialEvaluateExpr(env, selectedBranch);
    }
    else
    {
        // Condition is unknown - simplify all three parts
        var trueBranch = PartialEvaluateExpr(env, ce.Args[1]);
        var falseBranch = PartialEvaluateExpr(env, ce.Args[2]);
        return new CallExpr("?", new[] { condition, trueBranch, falseBranch }, ce.Location);
    }
}
```

#### Binary Operators

```csharp
private static EvalExpr PartialEvaluateCall(EvalEnvironment env, CallExpr ce)
{
    // Partially evaluate all arguments
    var partialArgs = ce.Args.Select(arg => PartialEvaluateExpr(env, arg)).ToList();

    // If all arguments are fully evaluated, try to execute the function
    if (partialArgs.All(IsFullyEvaluated))
    {
        try
        {
            var reconstructed = new CallExpr(ce.Function, partialArgs, ce.Location);
            var result = env.Evaluate(reconstructed);
            return result.Value;
        }
        catch
        {
            // Evaluation failed - keep as call expression
        }
    }

    // Reconstruct with simplified arguments
    return new CallExpr(ce.Function, partialArgs, ce.Location);
}
```

#### Array Expressions

```csharp
private static EvalExpr PartialEvaluateArray(EvalEnvironment env, ArrayExpr ae)
{
    var partialElements = ae.Values.Select(v => PartialEvaluateExpr(env, v)).ToList();

    // If all elements are fully evaluated, create an ArrayValue
    if (partialElements.All(IsFullyEvaluated))
    {
        var values = partialElements.Cast<ValueExpr>().ToList();
        return new ValueExpr(new ArrayValue(values));
    }

    // Otherwise, keep as ArrayExpr with simplified elements
    return new ArrayExpr(partialElements, ae.Location);
}
```

#### Let Expressions

```csharp
private static EvalExpr PartialEvaluateLet(EvalEnvironment env, LetExpr le)
{
    // Partially evaluate each binding and extend the environment
    var newEnv = env;
    var newVars = new List<(VarExpr, EvalExpr)>();

    foreach (var (varExpr, bindingExpr) in le.Vars)
    {
        var partialBinding = PartialEvaluateExpr(newEnv, bindingExpr);

        if (partialBinding is ValueExpr ve)
        {
            // Binding is fully evaluated - add to environment for future lookups
            newEnv = newEnv.WithVariable(varExpr.Name, partialBinding);
        }
        else
        {
            // Binding has runtime dependencies - keep in let expression
            newVars.Add((varExpr, partialBinding));
        }
    }

    // Partially evaluate the body with the extended environment
    var partialBody = PartialEvaluateExpr(newEnv, le.In);

    // If no variables remain, just return the body
    if (newVars.Count == 0)
    {
        return partialBody;
    }

    // Reconstruct let expression with remaining variables
    return new LetExpr(newVars, partialBody, le.Location);
}
```

#### Lambda Expressions

```csharp
private static EvalExpr PartialEvaluateLambda(EvalEnvironment env, LambdaExpr lambda)
{
    // Lambda parameters are unknown at compile-time, but we can still partially
    // evaluate the body using the compile-time values available in the environment

    // The lambda parameter ($x, $i, etc.) is an unknown runtime value
    // We don't add it to the environment, so references to it will remain as VarExpr

    // Partially evaluate the lambda body
    var partialBody = PartialEvaluateExpr(env, lambda.Value);

    // If the body hasn't changed, return the original lambda
    if (ReferenceEquals(partialBody, lambda.Value))
    {
        return lambda;
    }

    // Reconstruct lambda with simplified body
    return new LambdaExpr(lambda.Variable, partialBody, lambda.Location);
}
```

**Example:**
```
Input: map([1, 2, 3], $x => $x + $vv.offset)
Environment: { $vv: { offset: 5 } }

Lambda body evaluation:
- $x + $vv.offset
- Partial eval $x → VarExpr("x") (not in environment, kept as-is)
- Partial eval $vv.offset → ValueExpr(5)
- Result: $x + 5

Final: map([1, 2, 3], $x => $x + 5)
```

## Testing Strategy

### Test Cases

1. **Literal values remain unchanged**
   ```
   Input: 42
   Environment: {}
   Expected: 42
   ```

2. **Variable substitution**
   ```
   Input: $vv.x
   Environment: { $vv: { x: 100 } }
   Expected: 100
   ```

3. **Ternary with known condition (true)**
   ```
   Input: $vv.flag ? field1 : field2
   Environment: { $vv: { flag: true } }
   Expected: field1
   ```

4. **Ternary with known condition (false)**
   ```
   Input: $vv.length > 20 ? field1 + field2 : field3 + $vv.other
   Environment: { $vv: { length: 19, other: 40 } }
   Expected: field3 + 40
   ```

5. **Ternary with unknown condition**
   ```
   Input: field1 > 20 ? field2 : field3
   Environment: {}
   Expected: field1 > 20 ? field2 : field3
   ```

6. **Binary operation with both operands known**
   ```
   Input: $vv.a + $vv.b
   Environment: { $vv: { a: 10, b: 20 } }
   Expected: 30
   ```

7. **Binary operation with one operand known**
   ```
   Input: field1 + $vv.offset
   Environment: { $vv: { offset: 5 } }
   Expected: field1 + 5
   ```

8. **Binary operation with no operands known**
   ```
   Input: field1 + field2
   Environment: {}
   Expected: field1 + field2
   ```

9. **Nested expressions**
   ```
   Input: $vv.x > 10 ? field1 + $vv.y : field2 * $vv.z
   Environment: { $vv: { x: 15, y: 3, z: 2 } }
   Expected: field1 + 3
   ```

10. **Array with mixed known/unknown elements**
    ```
    Input: [$vv.a, field1, $vv.b]
    Environment: { $vv: { a: 1, b: 2 } }
    Expected: [1, field1, 2]
    ```

11. **Let expression with partial bindings**
    ```
    Input: let $x := $vv.value, $y := field1 in $x + $y
    Environment: { $vv: { value: 10 } }
    Expected: 10 + field1
    ```

12. **Lambda with compile-time values in body**
    ```
    Input: map([1, 2, 3], $x => $x + $vv.offset)
    Environment: { $vv: { offset: 5 } }
    Expected: map([1, 2, 3], $x => $x + 5)
    ```

## Public API

### .NET

```csharp
// Extension method on EvalEnvironment
public static EvalExpr PartialEvaluate(this EvalEnvironment env, EvalExpr expr)

// Usage example:
var env = EvalEnvironment.Create(
    new EvalData(compileTimeValues, /* property getter */)
);
var expr = ExprParser.Parse("$vv.length > 20 ? field1 + field2 : field3 + $vv.other");
var simplified = env.PartialEvaluate(expr);
var resultString = simplified.Print(); // "field3 + 40"
```

### TypeScript

```typescript
// Standalone function
export function partialEvaluate(env: EvalEnvironment, expr: EvalExpr): EvalExpr

// Usage example:
const env = createEnvironment({
    data: compileTimeValues,
    current: undefined
});
const expr = parseExpr("$vv.length > 20 ? field1 + field2 : field3 + $vv.other");
const simplified = partialEvaluate(env, expr);
const resultString = printExpr(simplified); // "field3 + 40"
```

## Implementation Order

1. **Phase 1: .NET Implementation**
   - Create `PartialEvaluator.cs` with basic structure
   - Implement helper methods (`IsFullyEvaluated`, `TryResolveVariable`)
   - Implement simple cases (ValueExpr, VarExpr, PropertyExpr)
   - Implement binary operators
   - Implement ternary operator
   - Implement array expressions
   - Implement let expressions

2. **Phase 2: .NET Testing**
   - Create test file
   - Write tests for all 12 test cases
   - Verify against example from requirements

3. **Phase 3: TypeScript Port**
   - Port implementation to TypeScript
   - Match the .NET API structure
   - Handle TypeScript-specific type differences

4. **Phase 4: TypeScript Testing**
   - Port tests to TypeScript
   - Verify feature parity with .NET implementation

5. **Phase 5: Documentation**
   - Add XML docs to .NET methods
   - Add JSDoc to TypeScript functions
   - Update package README files with usage examples

## Edge Cases to Consider

1. **Circular variable references** - Should not infinite loop
2. **Property access chains** - `$vv.obj.nested.field`
3. **Array indexing** - `$vv.arr[0]`
4. **Function calls with lambdas** - `map([1,2,3], $x => $x + $vv.offset)`
5. **Comparison operators** - `=`, `!=`, `<`, `>`, etc.
6. **Logical operators** - `and`, `or`
7. **Null/undefined values** - How to handle in partial evaluation
8. **Type coercion** - String + number, etc.

## Success Criteria

- ✅ Both .NET and TypeScript implementations complete
- ✅ All 12 test cases pass
- ✅ Example from requirements works correctly
- ✅ No breaking changes to existing evaluator
- ✅ Documentation complete
- ✅ Code review passed
