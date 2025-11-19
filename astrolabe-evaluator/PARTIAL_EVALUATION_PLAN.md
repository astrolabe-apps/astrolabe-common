# Partial Evaluation Implementation Plan

## Overview

Add partial evaluation support to the @astrolabe-evaluator package to enable symbolic computation and template evaluation without concrete data.

## Goals

1. **Symbolic Evaluation**: Evaluate expressions as much as possible, returning symbolic expressions when full evaluation isn't possible
2. **Template Support**: Analyze and work with expression templates before data is available
3. **Better Error Messages**: Identify exactly what failed to evaluate (which variable, which property)
4. **Optimization Opportunities**: Enable let expression simplification, dead code elimination, and conditional branch selection
5. **Backward Compatibility**: Preserve existing `evaluate()` behavior while adding new `evaluatePartial()` capability

## Core Principles

1. **Single Evaluation Path**: `evaluatePartial()` is the core evaluation engine, `evaluate()` wraps it with validation
2. **Eager Partial Evaluation**: Variables in let bindings are partially evaluated eagerly and stored as `EvalExpr`
3. **Optional Data Support**: Support evaluation without concrete data by making `data` and `current` optional
4. **Type Safety**: `ValueExpr` is a subtype of `EvalExpr`, so existing code continues to work

## Architecture Changes

### Type System Changes (ast.ts)

#### 1. Update FunctionValue Interface

```typescript
interface FunctionValue {
  // From: eval: (env: EvalEnv, args: CallExpr) => EnvValue<ValueExpr>
  // To:
  eval: (env: EvalEnv, args: CallExpr) => EnvValue<EvalExpr>;
  getType: (env: CheckEnv, args: CallExpr) => CheckValue<EvalType>;
}
```

**Rationale**: Functions need to return symbolic expressions when they can't fully evaluate their arguments.

#### 2. Update EvalEnvState Interface

```typescript
interface EvalEnvState {
  data: EvalData | undefined;           // Changed: now optional (was EvalData)
  current: ValueExpr | undefined;       // Changed: now optional (was ValueExpr)
  localVars: Record<string, EvalExpr>;  // Changed: from ValueExpr to EvalExpr
  parent?: EvalEnvState;
  errors: string[];
  compare: (v1: unknown, v2: unknown) => number;
}
```

**Rationale**:
- Optional `data` and `current` support evaluation without concrete data
- `localVars` stores `EvalExpr` to support symbolic variable bindings

#### 3. Update EvalEnv Abstract Class

```typescript
abstract class EvalEnv {
  abstract data: EvalData | undefined;        // Changed: now optional
  abstract current: ValueExpr | undefined;    // Changed: now optional
  abstract errors: string[];
  abstract state: EvalEnvState;
  abstract getVariable(name: string): EvalExpr | undefined;  // Changed: returns EvalExpr
  abstract compare(v1: unknown, v2: unknown): number;
  abstract withVariables(vars: [string, EvalExpr][]): EvalEnv;
  abstract withVariable(name: string, expr: EvalExpr): EvalEnv;
  abstract withCurrent(path: ValueExpr): EvalEnv;
  abstract evaluate(expr: EvalExpr): EnvValue<ValueExpr>;          // Existing method
  abstract evaluatePartial(expr: EvalExpr): EnvValue<EvalExpr>;    // New method
  abstract withError(error: string): EvalEnv;
}
```

**Rationale**: Add `evaluatePartial()` as the core evaluation method, keep `evaluate()` for backward compatibility.

#### 4. Update Helper Functions

```typescript
// Update lookupVar
// From: function lookupVar(state: EvalEnvState, name: string): ValueExpr | undefined
// To:
export function lookupVar(
  state: EvalEnvState,
  name: string,
): EvalExpr | undefined {
  if (name in state.localVars) {
    return state.localVars[name];
  }
  return state.parent ? lookupVar(state.parent, name) : undefined;
}
```

### Evaluation Logic Changes (evaluate.ts)

#### 1. Rename defaultEvaluate → defaultPartialEvaluate

```typescript
// From: export function defaultEvaluate(env: EvalEnv, expr: EvalExpr): EnvValue<ValueExpr>
// To:
export function defaultPartialEvaluate(
  env: EvalEnv,
  expr: EvalExpr,
): EnvValue<EvalExpr> {
  // Implementation changes below...
}
```

#### 2. Update Expression Cases for Partial Evaluation

**var case** - Return VarExpr itself when variable not found:
```typescript
case "var":
  const varExpr = env.getVariable(expr.variable);
  if (varExpr == null) {
    return [env, expr]; // Return VarExpr itself (not error) for partial eval
  }
  return env.evaluatePartial(varExpr); // Recursively evaluate stored expression
```

**call case** - Return CallExpr itself when function not found:
```typescript
case "call":
  const funcCall = env.getVariable(expr.function);
  if (funcCall == null) {
    return [env, expr]; // Return CallExpr itself for partial eval
  }
  return funcCall.function!.eval(env, expr);
```

**property case** - Return PropertyExpr unchanged when no data:
```typescript
case "property":
  if (env.data === undefined || env.current === undefined) {
    return [env, expr]; // Return PropertyExpr unchanged when no data context
  }
  return env.evaluatePartial(env.data.getProperty(env.current, expr.property));
```

**value case** - Already fully evaluated:
```typescript
case "value":
  return [env, expr];
```

**let case** - Partially evaluate bindings and body, return simplified LetExpr if needed:
```typescript
case "let":
  // Partially evaluate all bindings
  let currentEnv = env;
  const partialBindings: [VarExpr, EvalExpr][] = [];

  for (const [varExpr, bindingExpr] of expr.variables) {
    const [nextEnv, partialBinding] = currentEnv.evaluatePartial(bindingExpr);
    partialBindings.push([varExpr, partialBinding]);
    currentEnv = currentEnv.withVariable(varExpr.variable, partialBinding);
  }

  // Evaluate body with bindings in scope
  const [bodyEnv, bodyResult] = currentEnv.evaluatePartial(expr.expr);

  // If body is fully evaluated, return it directly (let disappears)
  if (bodyResult.type === "value") {
    return [bodyEnv, bodyResult];
  }

  // Otherwise, return simplified let expression
  return [bodyEnv, simplifyLet(partialBindings, bodyResult, expr.location)];
```

**Rationale**: This is essential for partial evaluation. When the body can't be fully evaluated, we must preserve the let structure with simplified bindings rather than losing variable information.

**array case** - Partially evaluate elements:
```typescript
case "array":
  return mapEnv(
    mapAllEnv(env, expr.values, (e, env) => env.evaluatePartial(e)),
    (v) => ({ value: v, type: "value" })
  );
```

#### 3. Implement evaluate() Wrapper

Add to DefaultEvalEnv class:

```typescript
evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
  const [env, result] = this.evaluatePartial(expr);

  // If fully evaluated, return the value
  if (result.type === "value") {
    return [env, result];
  }

  // Generate specific error messages for different symbolic results
  if (result.type === "var") {
    return [
      env.withError(`Variable $${result.variable} not found`),
      valueExpr(null)
    ];
  }

  if (result.type === "call") {
    return [
      env.withError(`Function $${result.function} could not be evaluated`),
      valueExpr(null)
    ];
  }

  if (result.type === "property") {
    return [
      env.withError(`Property access .${result.property} requires data context`),
      valueExpr(null)
    ];
  }

  return [
    env.withError("Expression could not be fully evaluated"),
    valueExpr(null)
  ];
}
```

**Rationale**: This wrapper provides backward compatibility - existing code using `evaluate()` gets the same behavior (errors on unknowns), while new code can use `evaluatePartial()` for symbolic evaluation.

#### 4. Update withVariables to Use Partial Evaluation

```typescript
withVariables(vars: [string, EvalExpr][]): EvalEnv {
  if (vars.length === 0) return this;

  let currentEnv = this as EvalEnv;
  const partiallyEvaluatedVars: Record<string, EvalExpr> = {};

  for (const [name, expr] of vars) {
    // Eagerly partially evaluate the expression
    const [nextEnv, partialResult] = currentEnv.evaluatePartial(expr);
    partiallyEvaluatedVars[name] = partialResult; // Store as EvalExpr

    currentEnv = this.newEnv({
      ...nextEnv.state,
      localVars: { ...partiallyEvaluatedVars },
      parent: this.state
    });
  }

  return currentEnv;
}
```

**Rationale**: Variables are eagerly partially evaluated when bound. This means `let $x = $add(2, 3)` will store `{ type: "value", value: 5 }`, but `let $x = $add(2, $y)` might store a symbolic CallExpr if `$y` is unknown.

#### 5. Update withVariable Similarly

```typescript
withVariable(name: string, expr: EvalExpr): EvalEnv {
  const [nextEnv, partialResult] = this.evaluatePartial(expr);
  return this.newEnv({
    ...nextEnv.state,
    localVars: { ...nextEnv.state.localVars, [name]: partialResult },
    parent: this.state
  });
}
```

### Default Functions Changes (defaultFunctions.ts)

#### 1. Update All Function Signatures

Change return type from `EnvValue<ValueExpr>` to `EnvValue<EvalExpr>` for all 37+ functions.

**Note**: Most functions can continue returning `ValueExpr` since it's a subtype of `EvalExpr`. The type change just allows them to return symbolic expressions when needed.

#### 2. Add Partial Evaluation Logic to Key Functions

**Conditional ($if)**:
```typescript
const condFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    if (call.args.length !== 3) {
      return [env.withError("Conditional expects 3 arguments"), NullExpr];
    }

    const [condExpr, thenExpr, elseExpr] = call.args;
    const [env1, condVal] = env.evaluatePartial(condExpr);

    // Only evaluate branches if condition is fully evaluated
    if (condVal.type === "value") {
      if (condVal.value === true) {
        return mapEnv(env1.evaluatePartial(thenExpr), (thenVal) =>
          valueExprWithDeps(thenVal.type === "value" ? thenVal.value : null, [condVal]),
        );
      } else if (condVal.value === false) {
        return mapEnv(env1.evaluatePartial(elseExpr), (elseVal) =>
          valueExprWithDeps(elseVal.type === "value" ? elseVal.value : null, [condVal]),
        );
      }
    }

    // Condition is unknown or not boolean - return symbolic CallExpr with partially evaluated condition
    return [env1, { ...call, args: [condVal, thenExpr, elseExpr] }];
  },
  constGetType(BooleanType)
);
```

**Binary Operators**:
```typescript
export function binFunction(
  func: (a: any, b: any, e: EvalEnv) => unknown,
  returnType: GetReturnType,
  name?: string,
): ValueExpr {
  return binEvalFunction(name ?? "_", returnType, (aE, bE, env) => {
    const [env1, a] = env.evaluatePartial(aE);
    const [env2, b] = env1.evaluatePartial(bE);

    // Check if both operands are fully evaluated
    if (a.type === "value" && b.type === "value") {
      if (a.value == null || b.value == null) {
        return [env2, valueExprWithDeps(null, [a, b])];
      }
      return [env2, valueExprWithDeps(func(a.value, b.value, env2), [a, b])];
    }

    // At least one operand is symbolic - return CallExpr with partially evaluated args
    return [env2, { type: "call", function: name ?? "_", args: [a, b] }];
  });
}
```

**Current Value Accessor ($current)**:
```typescript
// In the function that returns current value
if (env.current === undefined) {
  return [env, { type: "call", function: "current", args: [] }];
}
return [env, env.current];
```

**Property/Path Accessors**:
```typescript
// getProperty, getIndex, etc. should check for undefined data/current
if (env.data === undefined || env.current === undefined) {
  return [env, expr]; // Return symbolic expression
}
// ... normal property access logic
```

### Let Expression Simplification (Required for Correct Partial Evaluation)

Add utility functions for optimizing let expressions:

#### 1. Free Variables Analysis

```typescript
export function freeVariables(expr: EvalExpr): Set<string> {
  switch (expr.type) {
    case "var":
      return new Set([expr.variable]);

    case "let":
      const bodyVars = freeVariables(expr.expr);
      // Remove variables bound in this let
      expr.variables.forEach(([v]) => bodyVars.delete(v.variable));
      // Add free variables from binding expressions
      expr.variables.forEach(([_, e]) => {
        freeVariables(e).forEach(v => bodyVars.add(v));
      });
      return bodyVars;

    case "call":
      const vars = new Set<string>();
      if (expr.function.startsWith("$")) {
        vars.add(expr.function); // Function reference might be a variable
      }
      expr.args.forEach(arg => {
        freeVariables(arg).forEach(v => vars.add(v));
      });
      return vars;

    case "array":
      const arrayVars = new Set<string>();
      expr.values.forEach(val => {
        freeVariables(val).forEach(v => arrayVars.add(v));
      });
      return arrayVars;

    case "property":
      return freeVariables(expr.object);

    case "value":
      return new Set();

    case "lambda":
      const lambdaVars = freeVariables(expr.expr);
      expr.args.forEach(arg => lambdaVars.delete(arg.variable));
      return lambdaVars;

    default:
      return new Set();
  }
}
```

#### 2. Variable Substitution

```typescript
export function substitute(
  expr: EvalExpr,
  varName: string,
  replacement: EvalExpr
): EvalExpr {
  switch (expr.type) {
    case "var":
      return expr.variable === varName ? replacement : expr;

    case "let":
      // Check if any binding shadows the variable
      const shadowIndex = expr.variables.findIndex(([v]) => v.variable === varName);

      if (shadowIndex === -1) {
        // No shadowing - substitute in all bindings and body
        return {
          ...expr,
          variables: expr.variables.map(([v, e]) =>
            [v, substitute(e, varName, replacement)] as [VarExpr, EvalExpr]
          ),
          expr: substitute(expr.expr, varName, replacement)
        };
      } else {
        // Variable is shadowed - only substitute in bindings before the shadow
        return {
          ...expr,
          variables: expr.variables.map(([v, e], i) =>
            i < shadowIndex
              ? [v, substitute(e, varName, replacement)] as [VarExpr, EvalExpr]
              : [v, e]
          ),
          // Don't substitute in body - it's shadowed
        };
      }

    case "call":
      return {
        ...expr,
        args: expr.args.map(arg => substitute(arg, varName, replacement))
      };

    case "array":
      return {
        ...expr,
        values: expr.values.map(val => substitute(val, varName, replacement))
      };

    case "property":
      return {
        ...expr,
        object: substitute(expr.object, varName, replacement)
      };

    case "lambda":
      // Check if parameter shadows the variable
      if (expr.args.some(arg => arg.variable === varName)) {
        return expr; // Shadowed, don't substitute
      }
      return {
        ...expr,
        expr: substitute(expr.expr, varName, replacement)
      };

    case "value":
      return expr;

    default:
      return expr;
  }
}
```

#### 3. Let Simplification

```typescript
function isSimpleValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  );
}

export function simplifyLet(env: EvalEnv, letExpr: LetExpr): EnvValue<EvalExpr> {
  const usedVars = freeVariables(letExpr.expr);
  const relevantBindings: [VarExpr, EvalExpr][] = [];
  const inlineBindings = new Map<string, EvalExpr>();

  let currentEnv = env;

  for (const [varExpr, bindingExpr] of letExpr.variables) {
    const varName = varExpr.variable;

    // Dead variable elimination - skip if not used
    if (!usedVars.has(varName)) {
      continue;
    }

    // Partially evaluate the binding
    const [nextEnv, partialResult] = currentEnv.evaluatePartial(bindingExpr);
    currentEnv = nextEnv;

    // Constant propagation - inline simple values
    if (partialResult.type === "value" && isSimpleValue(partialResult.value)) {
      inlineBindings.set(varName, partialResult);
    } else {
      relevantBindings.push([varExpr, partialResult]);
    }
  }

  // Apply inlining to body
  let simplifiedBody = letExpr.expr;
  inlineBindings.forEach((replacement, varName) => {
    simplifiedBody = substitute(simplifiedBody, varName, replacement);
  });

  // Recursively simplify the body
  const [bodyEnv, partialBody] = currentEnv.evaluatePartial(simplifiedBody);

  // Let flattening - if no bindings remain, return the simplified body
  if (relevantBindings.length === 0) {
    return [bodyEnv, partialBody];
  }

  // Return simplified let expression
  return [bodyEnv, {
    type: "let",
    variables: relevantBindings,
    expr: partialBody,
    location: letExpr.location
  }];
}
```

## Testing Strategy

### 1. Backward Compatibility Tests

Verify all existing tests in `defaultFunctions.test.ts` continue to pass without modification.

### 2. New Partial Evaluation Tests

Create `partialEvaluation.test.ts` with comprehensive test cases:

```typescript
import { describe, test, expect } from "@jest/globals";

describe("Partial Evaluation", () => {
  describe("Unknown Variables", () => {
    test("unknown variable returns VarExpr", () => {
      const env = createEnv(undefined, undefined);
      const [_, result] = env.evaluatePartial(varExpr("x"));
      expect(result.type).toBe("var");
      expect((result as VarExpr).variable).toBe("x");
    });

    test("evaluate() returns error for unknown variable", () => {
      const env = createEnv(undefined, undefined);
      const [resultEnv, result] = env.evaluate(varExpr("x"));
      expect(result.type).toBe("value");
      expect(result.value).toBe(null);
      expect(resultEnv.errors).toContain("Variable $x not found");
    });
  });

  describe("Property Access Without Data", () => {
    test("property access without data returns PropertyExpr", () => {
      const env = createEnv(undefined, undefined);
      const [_, result] = env.evaluatePartial(propertyExpr("name"));
      expect(result.type).toBe("property");
    });

    test("evaluate() returns error for property without data", () => {
      const env = createEnv(undefined, undefined);
      const [resultEnv, result] = env.evaluate(propertyExpr("name"));
      expect(resultEnv.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Arithmetic with Unknowns", () => {
    test("arithmetic with unknown returns CallExpr", () => {
      const env = createEnv(undefined, undefined);
      const expr = callExpr("add", [valueExpr(5), varExpr("x")]);
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("call");
    });

    test("arithmetic with all knowns returns value", () => {
      const env = createEnv(undefined, undefined);
      const expr = callExpr("add", [valueExpr(5), valueExpr(3)]);
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(8);
    });
  });

  describe("Conditional Branch Selection", () => {
    test("conditional with true condition evaluates then branch", () => {
      const env = createEnv(undefined, undefined);
      const expr = callExpr("if", [
        valueExpr(true),
        valueExpr("yes"),
        valueExpr("no")
      ]);
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe("yes");
    });

    test("conditional with false condition evaluates else branch", () => {
      const env = createEnv(undefined, undefined);
      const expr = callExpr("if", [
        valueExpr(false),
        valueExpr("yes"),
        valueExpr("no")
      ]);
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe("no");
    });

    test("conditional with unknown condition returns CallExpr", () => {
      const env = createEnv(undefined, undefined);
      const expr = callExpr("if", [
        varExpr("condition"),
        valueExpr("yes"),
        valueExpr("no")
      ]);
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("call");
    });
  });

  describe("Let Expression Simplification", () => {
    test("unused variable is eliminated", () => {
      const env = createEnv(undefined, undefined);
      const expr = letExpr(
        [["x", valueExpr(5)], ["y", valueExpr(10)]],
        varExpr("y")
      );
      const [_, result] = simplifyLet(env, expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(10);
    });

    test("simple values are inlined", () => {
      const env = createEnv(undefined, undefined);
      const expr = letExpr(
        [["x", valueExpr(5)]],
        callExpr("add", [varExpr("x"), valueExpr(3)])
      );
      const [_, result] = simplifyLet(env, expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(8);
    });

    test("complex expressions are not inlined", () => {
      const env = createEnv(undefined, undefined);
      const expr = letExpr(
        [["x", callExpr("add", [valueExpr(2), valueExpr(3)])]],
        callExpr("multiply", [varExpr("x"), valueExpr(2)])
      );
      const [_, result] = simplifyLet(env, expr);
      // x should be evaluated to 5 and inlined
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(10);
    });
  });

  describe("Nested Partial Evaluation", () => {
    test("nested let with partial evaluation", () => {
      const env = createEnv(undefined, undefined);
      const expr = letExpr(
        [["x", valueExpr(5)]],
        letExpr(
          [["y", callExpr("add", [varExpr("x"), valueExpr(3)])]],
          varExpr("y")
        )
      );
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(8);
    });
  });

  describe("Variable Shadowing", () => {
    test("inner variable shadows outer", () => {
      const env = createEnv(undefined, undefined);
      const expr = letExpr(
        [["x", valueExpr(5)]],
        letExpr(
          [["x", valueExpr(10)]],
          varExpr("x")
        )
      );
      const [_, result] = env.evaluatePartial(expr);
      expect(result.type).toBe("value");
      expect((result as ValueExpr).value).toBe(10);
    });
  });
});
```

## Implementation Order

1. **Phase 1: Type System Updates**
   - Update `FunctionValue.eval` signature in ast.ts
   - Update `EvalEnvState` (make data/current optional, change localVars type)
   - Update `EvalEnv` abstract class (add evaluatePartial, change getVariable return type)
   - Update `lookupVar` function
   - Update any other type-dependent utilities

2. **Phase 2: Core Evaluation Logic**
   - Rename `defaultEvaluate` to `defaultPartialEvaluate` in evaluate.ts
   - Update all expression case handlers to return symbolic expressions when appropriate
   - Update `withVariables` and `withVariable` to use evaluatePartial
   - Implement `evaluate()` wrapper with validation in DefaultEvalEnv

3. **Phase 3: Function Updates**
   - Update all 37+ default function signatures in defaultFunctions.ts
   - Add partial evaluation logic to key functions ($if, $current, binary operators)
   - Add undefined data/current checks where needed

4. **Phase 4: Simplification Helpers** (Required)
   - Implement `freeVariables` function
   - Implement `substitute` function
   - Implement `simplifyLet` function
   - These are essential for the let case in defaultPartialEvaluate

5. **Phase 5: Testing**
   - Run existing tests to verify backward compatibility
   - Create `partialEvaluation.test.ts` with comprehensive test cases
   - Fix any issues discovered during testing

6. **Phase 6: Documentation**
   - Update exports in index.ts
   - Add JSDoc comments for new methods
   - Update README if needed

## Backward Compatibility

### What's Preserved

✅ **`evaluate()` behavior** - Still returns `ValueExpr`, generates errors for unknowns
✅ **Function implementations** - Most can continue returning `ValueExpr` (subtype of `EvalExpr`)
✅ **Public API** - `evaluatePartial()` is additive, doesn't break existing usage
✅ **Test suite** - All existing tests should pass without modification

### What Changes (Internal)

⚠️ **Variable storage** - `localVars` now stores `EvalExpr` instead of `ValueExpr`
⚠️ **Data/current types** - Now optional (`undefined` for symbolic evaluation)
⚠️ **Function signatures** - Return type widens to `EvalExpr` (compatible)

## Expected Benefits

1. **Symbolic Computation**: Work with expressions that have unknown variables
2. **Template Evaluation**: Analyze expression structure without concrete data
3. **Better Error Messages**: Know exactly what failed (which variable, which property)
4. **Branch Elimination**: `$if(true, a, b)` → `a` without evaluating `b`
5. **Dead Code Elimination**: Remove unused let bindings
6. **Constant Propagation**: Inline simple values to simplify expressions
7. **Query Optimization Foundation**: Enable future expression transformation and optimization

## Example Use Cases

### 1. Expression Template Analysis

```typescript
// Analyze an expression template without data
const env = createEnv(undefined, undefined);
const template = letExpr(
  [["userId", varExpr("currentUser")]],
  callExpr("eq", [propertyExpr("userId"), varExpr("userId")])
);

const [_, simplified] = env.evaluatePartial(template);
// Result: symbolic expression showing the structure
```

### 2. Conditional Optimization

```typescript
// Branch selection at evaluation time
const env = createEnv(someData, currentValue);
const expr = callExpr("if", [
  valueExpr(true),
  callExpr("expensiveOperation", []),
  callExpr("anotherExpensiveOperation", [])
]);

const [_, result] = env.evaluatePartial(expr);
// Result: only the "then" branch is evaluated, "else" branch is skipped
```

### 3. Let Expression Simplification

```typescript
const expr = letExpr(
  [
    ["x", valueExpr(5)],
    ["y", valueExpr(10)],
    ["z", callExpr("add", [varExpr("x"), varExpr("y")])]
  ],
  varExpr("x") // Only uses x
);

const [_, simplified] = simplifyLet(env, expr);
// Result: { type: "value", value: 5 }
// y and z are eliminated as unused
```

## Open Questions

None - plan is complete and approved for implementation.

## Implementation Checklist

- [ ] Update type definitions in ast.ts
- [ ] Rename defaultEvaluate → defaultPartialEvaluate
- [ ] Implement evaluate() wrapper
- [ ] Update withVariables/withVariable
- [ ] Update all default function signatures
- [ ] Add partial evaluation logic to key functions
- [ ] Implement simplification helpers
- [ ] Add comprehensive tests
- [ ] Verify backward compatibility
- [ ] Update exports and documentation
