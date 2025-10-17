# Short-Circuit Boolean Operations Implementation Plan

## Overview

This document outlines the plan to add short-circuit evaluation to the `and` and `or` boolean operations in both the C# (Astrolabe.Evaluator) and TypeScript (astrolabe-evaluator) implementations.

## Current Implementation

### C# Implementation
**File:** `Astrolabe.Evaluator/Functions/DefaultFunctions.cs` (lines 159-181)

Both `and` and `or` are implemented using `ArrayAggOp`, which:
- Evaluates ALL arguments upfront before applying the operation
- Uses `reduce` to aggregate all values
- Cannot exit early even when the result is already determined

```csharp
{
    "and",
    ArrayAggOp(
        (bool?)true,
        (acc, v) =>
            (acc, v) switch
            {
                ({ } a, bool b) => a && b,
                _ => null,
            }
    )
},
{
    "or",
    ArrayAggOp(
        (bool?)false,
        (acc, v) =>
            (acc, v) switch
            {
                ({ } a, bool b) => a || b,
                _ => null,
            }
    )
},
```

### TypeScript Implementation
**File:** `astrolabe-evaluator/src/defaultFunctions.ts` (lines 426-433)

Similarly, both operations use `aggFunction` which:
- Evaluates all arguments first via `evaluateAll`
- Uses `reduce` to process all values
- No early exit capability

```typescript
and: aggFunction(
  () => true,
  (acc, b) => acc && (b as boolean),
),
or: aggFunction(
  () => false,
  (acc, b) => acc || (b as boolean),
),
```

## Problem Statement

The current implementation evaluates all arguments even when the result can be determined early:

1. **`and` operation**: Should stop evaluating as soon as it encounters `false` or `null`
2. **`or` operation**: Should stop evaluating as soon as it encounters `true`

This is inefficient and doesn't match standard boolean operator behavior in most programming languages.

## Proposed Solution

### C# Changes

**File:** `Astrolabe.Evaluator/Functions/DefaultFunctions.cs`

1. Create a new helper function `ShortCircuitBoolOp`:

```csharp
private static FunctionHandler ShortCircuitBoolOp(
    bool? initialValue,
    Func<bool?, bool?, bool?> shouldContinue
)
{
    return new FunctionHandler(
        (env, call) =>
        {
            var currentEnv = env;
            bool? result = initialValue;
            var evaluatedArgs = new List<ValueExpr>();

            foreach (var arg in call.Args)
            {
                var (nextEnv, argValue) = currentEnv.Evaluate(arg);
                currentEnv = nextEnv;
                evaluatedArgs.Add(argValue);

                if (argValue.Value is not bool boolVal)
                {
                    result = null;
                    break;
                }

                result = shouldContinue(result, boolVal);
                if (result == false || result == null) // Short-circuit condition
                    break;
            }

            return currentEnv.WithValue(ValueExpr.WithDeps(result, evaluatedArgs));
        }
    );
}
```

2. Replace the `and` and `or` definitions:

```csharp
{
    "and",
    ShortCircuitBoolOp(
        true,
        (acc, b) => acc == true && b == true ? true : (acc == false || b == false ? false : null)
    )
},
{
    "or",
    ShortCircuitBoolOp(
        false,
        (acc, b) => acc == true || b == true ? true : (acc == false && b == false ? false : null)
    )
},
```

### TypeScript Changes

**File:** `astrolabe-evaluator/src/defaultFunctions.ts`

1. Create a new helper function `shortCircuitBoolOp`:

```typescript
function shortCircuitBoolOp(
  initialValue: boolean,
  shouldShortCircuit: (value: boolean) => boolean,
): ValueExpr {
  return functionValue(
    (env, call) => {
      let currentEnv = env;
      let result: boolean | null = initialValue;
      const evaluatedArgs: ValueExpr[] = [];

      for (const arg of call.args) {
        const [nextEnv, argValue] = currentEnv.evaluate(arg);
        currentEnv = nextEnv;
        evaluatedArgs.push(argValue);

        if (argValue.value == null) {
          result = null;
          break;
        }

        if (typeof argValue.value !== 'boolean') {
          return [
            currentEnv.withError('Boolean operation received non-boolean value'),
            NullExpr,
          ];
        }

        result = argValue.value;

        if (shouldShortCircuit(argValue.value)) {
          break;
        }
      }

      return [currentEnv, valueExprWithDeps(result, evaluatedArgs)];
    },
    constGetType(BooleanType),
  );
}
```

2. Replace the `and` and `or` definitions:

```typescript
and: shortCircuitBoolOp(
  true,
  (value) => value === false, // Short-circuit on false
),
or: shortCircuitBoolOp(
  false,
  (value) => value === true, // Short-circuit on true
),
```

## Implementation Steps

### Phase 1: C# Implementation
1. Add the `ShortCircuitBoolOp` helper function to `DefaultFunctions.cs`
2. Replace the `and` and `or` entries in the `FunctionHandlers` dictionary
3. Ensure the implementation properly handles:
   - Null values
   - Dependency tracking (only evaluated args)
   - Environment threading

### Phase 2: C# Testing
1. Add test cases to verify short-circuit behavior:
   - `and` stops on first `false`
   - `and` stops on first `null`
   - `or` stops on first `true`
   - Multiple arguments with early exit
2. Add tests with expressions that would cause errors if evaluated (to prove they weren't evaluated)
3. Run existing test suite to ensure no regressions

### Phase 3: TypeScript Implementation
1. Add the `shortCircuitBoolOp` helper function to `defaultFunctions.ts`
2. Replace the `and` and `or` definitions
3. Ensure consistency with C# semantics
4. Verify dependency tracking works correctly

### Phase 4: TypeScript Testing
1. Mirror C# test cases in TypeScript
2. Add additional tests for:
   - Null handling
   - Type checking
   - Dependency tracking
3. Run existing test suite to ensure no regressions

### Phase 5: Validation
1. Build both projects
2. Run full test suites
3. Verify backward compatibility
4. Update any documentation if needed

## Test Cases

### Test 1: AND short-circuits on false
```
and(true, false, error()) → false (error never evaluated)
```

### Test 2: AND short-circuits on null
```
and(true, null, error()) → null (error never evaluated)
```

### Test 3: OR short-circuits on true
```
or(false, true, error()) → true (error never evaluated)
```

### Test 4: All values evaluated when necessary
```
and(true, true, true) → true (all evaluated)
or(false, false, true) → true (all evaluated)
```

### Test 5: Dependency tracking
```
Dependencies should only include evaluated arguments, not skipped ones
```

## Key Considerations

1. **Null Handling**:
   - `and`: Returns `null` if any evaluated value is `null`
   - `or`: Returns `null` if any evaluated value is `null` before finding `true`

2. **Dependency Tracking**:
   - Only evaluated arguments should be included in dependencies
   - Short-circuited arguments should not appear in deps

3. **Environment Threading**:
   - Must properly thread the `EvalEnvironment` through sequential evaluations
   - Errors from evaluated arguments should be preserved

4. **Backward Compatibility**:
   - The behavior change should be transparent to existing code
   - Results should be identical, just more efficient

5. **Performance**:
   - Short-circuiting provides significant performance benefits for:
     - Complex expressions
     - Long argument lists
     - Expressions with side effects or expensive computations

## Success Criteria

- ✅ `and` operation stops evaluating on first `false` or `null`
- ✅ `or` operation stops evaluating on first `true`
- ✅ All existing tests pass
- ✅ New tests verify short-circuit behavior
- ✅ Dependency tracking only includes evaluated arguments
- ✅ C# and TypeScript implementations have consistent semantics
- ✅ No performance regressions
- ✅ Clean compilation with no warnings

## Files to Modify

### C#
- `Astrolabe.Evaluator/Functions/DefaultFunctions.cs`
- Test file(s) in `Astrolabe.Evaluator.Tests/` or similar

### TypeScript
- `astrolabe-evaluator/src/defaultFunctions.ts`
- Test file(s) in `astrolabe-evaluator/test/`

## Estimated Effort

- C# Implementation: 1-2 hours
- C# Testing: 1 hour
- TypeScript Implementation: 1-2 hours
- TypeScript Testing: 1 hour
- Validation & Documentation: 1 hour

**Total: 5-7 hours**
