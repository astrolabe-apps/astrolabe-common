# Reactive Re-evaluation Implementation Plan

## Overview

This document outlines the plan for implementing **reactive re-evaluation** in the astrolabe-evaluator using @astrolabe-controls' reactive system.

### What is Reactive Re-evaluation?

Instead of manually re-evaluating expressions when data changes, expressions automatically re-run when their dependencies change.

**Before (Static):**
```typescript
const data = { firstName: "John", lastName: "Doe" };
const expr = parseEval('firstName + " " + lastName');
let result = evaluate(expr, data);  // "John Doe"

data.firstName = "Jane";
result = evaluate(expr, data);  // Manual re-evaluation required
```

**After (Reactive):**
```typescript
const dataControl = newControl({ firstName: "John", lastName: "Doe" });
const expr = parseEval('firstName + " " + lastName');
const resultControl = evaluateReactive(expr, dataControl);
console.log(resultControl.value);  // "John Doe"

dataControl.fields.firstName.value = "Jane";
console.log(resultControl.value);  // "Jane Doe" - automatically updated!
```

### Key Design Decisions

1. **Keep Eager Evaluation** - No lazy evaluation (preserves environment threading)
2. **Reactivity is Orthogonal** - Static deps for type checking, reactive for runtime
3. **Control-Based Data** - Use Controls as the evaluation context
4. **Automatic Dependency Tracking** - collectChanges captures what's accessed
5. **Hybrid Approach** - Both static and reactive evaluation supported

## Why Not Lazy Evaluation?

After analyzing Astrolabe.Validation (C# implementation), we confirmed that **lazy evaluation breaks environment threading**.

### The Problem

```typescript
// With lazy evaluation
let $a := errorExpr, $b := goodExpr in $b

// Environment threading breaks:
1. Store thunk for $a with env0
2. Store thunk for $b with env0  // WRONG! Lost error from $a
3. Evaluate body - only accesses $b
4. Force $b with env0 → errors from $a are lost!
```

### The Solution

Astrolabe.Validation uses **eager evaluation with explicit short-circuiting**:
- All expressions evaluated immediately in sequence
- Environment threaded through each evaluation: `[env0, val0] → [env1, val1] → [env2, val2]`
- Errors/side effects accumulate properly
- Short-circuiting (AND/OR) is explicit in operators, not via lazy evaluation

**Reactive re-evaluation provides efficiency through automatic updates (only when deps change) rather than deferred evaluation (only when accessed).**

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────┐
│                  User Application                    │
│                                                      │
│  const expr = parseEval('firstName + " " + lastName')│
│  const result = evaluateReactive(expr, dataControl) │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              ReactiveEvalEnv                         │
│  • Extends BasicEvalEnv                             │
│  • Works with Control<any> instead of plain values  │
│  • Property access triggers collectChanges          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│         @astrolabe-controls Reactive System          │
│  • collectChanges - tracks property access          │
│  • Effect - re-runs when dependencies change         │
│  • SubscriptionTracker - manages subscriptions      │
│  • updateComputedValue - creates reactive computed   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Evaluation**
   ```
   evaluateReactive(expr, dataControl)
     → createEffect(compute, setValue)
       → collectChanges(() => env.evaluate(expr))
         → Accesses dataControl.fields.firstName.value  [TRACKED]
         → Accesses dataControl.fields.lastName.value   [TRACKED]
         → Returns "John Doe"
       → SubscriptionTracker.update()
         → Subscribes to firstName and lastName changes
     → Returns Control<ValueExpr> with value "John Doe"
   ```

2. **On Data Change**
   ```
   dataControl.fields.firstName.value = "Jane"
     → Control notifies subscribers
       → Effect's listener callback triggered
         → addAfterChangesCallback(runEffect)
           → runEffect() executes after transaction
             → collectChanges(() => env.evaluate(expr))
               → Re-accesses firstName and lastName [RE-TRACKED]
               → Returns "Jane Doe"
             → SubscriptionTracker.update()
               → Subscriptions unchanged (same deps)
         → resultControl.value = "Jane Doe"
   ```

## Implementation Phases

### Phase 1: Foundation (Control-Based Evaluation)

**Goal:** Make the evaluator work with Controls as the data source.

**Files to modify:**
- `src/ast.ts` - Add reactive environment types
- `src/evaluate.ts` - Create ReactiveEvalEnv class
- `package.json` - Add @astrolabe-controls dependency

**New interfaces:**

```typescript
// ast.ts
export interface ReactiveEvalData {
  root: Control<Record<string, any>>;
  getProperty(parent: Control<any>, property: string): Control<any>;
}

export interface ReactiveEvalEnvState extends EvalEnvState {
  data: ReactiveEvalData;
  current: Control<any>;
}
```

**New class:**

```typescript
// evaluate.ts
export class ReactiveEvalEnv extends BasicEvalEnv {
  constructor(
    public dataControl: Control<any>,
    initialVars: Record<string, ValueExpr> = {}
  ) {
    super({
      data: {
        root: dataControl,
        getProperty(parent: Control<any>, prop: string): Control<any> {
          // Access parent.fields[prop] - tracked by collectChanges!
          return parent.fields[prop];
        }
      },
      current: dataControl,
      localVars: initialVars,
      errors: [],
      compare: compareSignificantDigits(5)
    });
  }

  // Override property access to read from controls
  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    switch (expr.type) {
      case "property": {
        const propControl = this.data.getProperty(
          this.current as Control<any>,
          expr.property
        );
        // Reading .value triggers collectChange
        const value = propControl.value;
        return [this, valueExpr(value, propControl.path)];
      }
      // ... delegate to super for other cases
      default:
        return super.evaluate(expr);
    }
  }
}
```

**Testing:**
```typescript
// test/reactiveEval.test.ts
test("ReactiveEvalEnv accesses control properties", () => {
  const data = newControl({ name: "John", age: 30 });
  const env = new ReactiveEvalEnv(data);
  const expr = parseEval('name');

  const [_, result] = env.evaluate(expr);
  expect(result.value).toBe("John");
});
```

### Phase 2: Reactive Evaluation Function

**Goal:** Create the main API for reactive evaluation.

**New file:** `src/reactiveEvaluate.ts`

```typescript
import { Control } from "@astrolabe-controls";
import { updateComputedValue } from "@astrolabe-controls";
import { newControl } from "@astrolabe-controls";
import { EvalExpr, ValueExpr } from "./ast";
import { ReactiveEvalEnv } from "./evaluate";

/**
 * Evaluates an expression reactively.
 * The result automatically updates when dependencies in dataControl change.
 *
 * @param expr - The expression to evaluate
 * @param dataControl - Control containing the data context
 * @returns Control that holds the result and updates automatically
 */
export function evaluateReactive(
  expr: EvalExpr,
  dataControl: Control<any>
): Control<ValueExpr> {
  // Create a control to hold the result
  const resultControl = newControl<ValueExpr>(valueExpr(null));

  // Create reactive environment
  const env = new ReactiveEvalEnv(dataControl);

  // Use updateComputedValue to make it reactive
  updateComputedValue(resultControl, () => {
    // This runs inside collectChanges, so all control accesses are tracked
    const [envWithErrors, value] = env.evaluate(expr);

    // Could expose errors on the result control
    if (envWithErrors.errors.length > 0) {
      resultControl.setErrors({
        evaluation: envWithErrors.errors.join(", ")
      });
    } else {
      resultControl.clearErrors();
    }

    return value;
  });

  return resultControl;
}

/**
 * Parse and evaluate reactively in one step.
 */
export function parseAndEvaluateReactive(
  source: string,
  dataControl: Control<any>
): Control<ValueExpr> {
  const expr = parseEval(source);
  return evaluateReactive(expr, dataControl);
}
```

**Testing:**
```typescript
test("evaluateReactive updates when data changes", () => {
  const data = newControl({ x: 10, y: 20 });
  const expr = parseEval('x + y');
  const result = evaluateReactive(expr, data);

  expect(result.value.value).toBe(30);

  data.fields.x.value = 15;
  expect(result.value.value).toBe(35);  // Auto-updated!

  data.fields.y.value = 25;
  expect(result.value.value).toBe(40);  // Auto-updated!
});
```

### Phase 3: Conditional Dependencies

**Goal:** Ensure reactive tracking handles conditional expressions correctly.

**Key insight:** The Effect system already handles this automatically through `collectChanges` and dynamic subscription updates.

**Testing:**
```typescript
test("conditional dependencies update correctly", () => {
  const data = newControl({
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

  // Initially hidden - only subscribed to showDetails
  expect(result.value.value).toBe("Hidden");

  // Change firstName - should NOT trigger update (not subscribed)
  data.fields.firstName.value = "Jane";
  expect(result.value.value).toBe("Hidden");

  // Show details - now subscribes to firstName and lastName
  data.fields.showDetails.value = true;
  expect(result.value.value).toBe("Jane Doe");

  // Change firstName - DOES trigger update now
  data.fields.firstName.value = "Bob";
  expect(result.value.value).toBe("Bob Doe");

  // Hide details - unsubscribes from name fields
  data.fields.showDetails.value = false;
  expect(result.value.value).toBe("Hidden");

  // Change firstName again - should NOT trigger update
  data.fields.firstName.value = "Alice";
  expect(result.value.value).toBe("Hidden");
});
```

### Phase 4: Let Bindings with Reactive Evaluation

**Goal:** Ensure let bindings work correctly with reactive re-evaluation.

**Key insight:** Let bindings are still evaluated **eagerly** during each reactive run, but the **entire expression re-runs** when dependencies change.

**No changes needed** - the existing eager evaluation in `withVariables` works perfectly:

```typescript
// evaluate.ts:135-163 (existing code)
withVariables(vars: [string, EvalExpr][]): EvalEnv {
  // ... existing eager evaluation code ...
  for (const [name, expr] of vars) {
    const [nextEnv, value] = currentEnv.evaluate(expr);
    evaluatedVars[name] = value;
    currentEnv = nextEnv;  // Thread environment
  }
  // ...
}
```

**Testing:**
```typescript
test("let bindings re-evaluate reactively", () => {
  const data = newControl({
    firstName: "John",
    lastName: "Doe"
  });

  const expr = parseEval(`
    let $fullName := firstName + " " + lastName,
        $greeting := "Hello, " + $fullName
    in $greeting + "!"
  `);

  const result = evaluateReactive(expr, data);
  expect(result.value.value).toBe("Hello, John Doe!");

  // Change firstName - entire expression re-evaluates
  data.fields.firstName.value = "Jane";
  expect(result.value.value).toBe("Hello, Jane Doe!");

  // All bindings re-computed:
  // 1. $fullName = "Jane Doe"
  // 2. $greeting = "Hello, Jane Doe"
  // 3. Result = "Hello, Jane Doe!"
});
```

### Phase 5: Hybrid Static + Runtime Tracking

**Goal:** Use both static deps (for type checking) and runtime tracking (for correctness).

**Implementation:**

```typescript
// reactiveEvaluate.ts
export function evaluateReactive(
  expr: EvalExpr,
  dataControl: Control<any>,
  options: {
    validateDeps?: boolean;  // Enable in development
  } = {}
): Control<ValueExpr> {
  const resultControl = newControl<ValueExpr>(valueExpr(null));
  const env = new ReactiveEvalEnv(dataControl);

  updateComputedValue(resultControl, () => {
    let accessedControls: Array<{ control: Control<any>, path: string }> = [];

    if (options.validateDeps) {
      // Capture which controls were accessed
      const originalCollectChange = collectChange;
      setChangeCollector((control, change) => {
        accessedControls.push({
          control,
          path: getControlPath(control, dataControl)
        });
        originalCollectChange?.(control, change);
      });
    }

    const [envWithErrors, value] = env.evaluate(expr);

    if (options.validateDeps && value.deps) {
      // Validate static deps match runtime deps
      const runtimePaths = accessedControls.map(x => x.path);
      const staticPaths = value.deps.map(pathToString);

      const missing = staticPaths.filter(p => !runtimePaths.includes(p));
      const extra = runtimePaths.filter(p => !staticPaths.includes(p));

      if (missing.length > 0 || extra.length > 0) {
        console.warn("Dependency mismatch:", {
          static: staticPaths,
          runtime: runtimePaths,
          missing,
          extra
        });
      }
    }

    return value;
  });

  return resultControl;
}
```

### Phase 6: Integration with Existing Forms

**Goal:** Make reactive evaluation work seamlessly with existing form systems.

**Use case:** Computed form fields

```typescript
// Example: Form with computed fields
interface FormData {
  quantity: number;
  pricePerUnit: number;
  subtotal?: number;  // Computed
  taxRate: number;
  tax?: number;       // Computed
  total?: number;     // Computed
}

const formControl = newControl<FormData>({
  quantity: 1,
  pricePerUnit: 10.00,
  taxRate: 0.08
});

// Set up computed fields
const subtotalExpr = parseEval('quantity * pricePerUnit');
const taxExpr = parseEval('subtotal * taxRate');
const totalExpr = parseEval('subtotal + tax');

// Make subtotal reactive
updateComputedValue(
  formControl.fields.subtotal,
  () => {
    const result = evaluateReactive(subtotalExpr, formControl);
    return result.value.value as number;
  }
);

// Make tax reactive (depends on subtotal)
updateComputedValue(
  formControl.fields.tax,
  () => {
    const result = evaluateReactive(taxExpr, formControl);
    return result.value.value as number;
  }
);

// Make total reactive (depends on subtotal and tax)
updateComputedValue(
  formControl.fields.total,
  () => {
    const result = evaluateReactive(totalExpr, formControl);
    return result.value.value as number;
  }
);

// Now everything updates automatically
formControl.fields.quantity.value = 2;
// subtotal → 20.00
// tax → 1.60
// total → 21.60

formControl.fields.pricePerUnit.value = 15.00;
// subtotal → 30.00
// tax → 2.40
// total → 32.40
```

### Phase 7: Performance Optimization

**Goal:** Minimize overhead and optimize hot paths.

**Strategies:**

1. **Batch Updates**
   ```typescript
   import { groupedChanges } from "@astrolabe-controls";

   groupedChanges(() => {
     data.fields.firstName.value = "Jane";
     data.fields.lastName.value = "Smith";
     data.fields.age.value = 25;
   });
   // Expression only re-evaluates ONCE with final state
   ```

2. **Cleanup Unused Subscriptions**
   ```typescript
   const result = evaluateReactive(expr, data);

   // Later when done
   result.cleanup();  // Removes all subscriptions
   ```

3. **Selective Reactivity**
   ```typescript
   // Not everything needs to be reactive
   function evaluateStatic(expr: EvalExpr, data: any): ValueExpr {
     const env = new BasicEvalEnv(emptyEnvState(data));
     const [_, value] = env.evaluate(expr);
     return value;
   }

   // Use reactive only where needed
   const staticResult = evaluateStatic(simpleExpr, plainData);
   const reactiveResult = evaluateReactive(complexExpr, controlData);
   ```

4. **Memoization for Pure Expressions**
   ```typescript
   const memoCache = new Map<string, ValueExpr>();

   function evaluateWithMemo(expr: EvalExpr, data: any): ValueExpr {
     const key = JSON.stringify({ expr, data });
     if (memoCache.has(key)) {
       return memoCache.get(key)!;
     }
     const result = evaluateStatic(expr, data);
     memoCache.set(key, result);
     return result;
   }
   ```

## API Design

### Public API

```typescript
// Main reactive evaluation function
export function evaluateReactive(
  expr: EvalExpr,
  dataControl: Control<any>,
  options?: ReactiveEvalOptions
): Control<ValueExpr>;

// Parse and evaluate in one step
export function parseAndEvaluateReactive(
  source: string,
  dataControl: Control<any>,
  options?: ReactiveEvalOptions
): Control<ValueExpr>;

// Create reactive data context from plain object
export function createReactiveData<T extends Record<string, any>>(
  initialData: T,
  setup?: ControlSetup<T>
): Control<T>;

// Options
export interface ReactiveEvalOptions {
  validateDeps?: boolean;  // Validate static vs runtime deps
  onError?: (errors: string[]) => void;  // Error callback
}

// Reactive environment (for advanced usage)
export class ReactiveEvalEnv extends BasicEvalEnv {
  constructor(
    dataControl: Control<any>,
    initialVars?: Record<string, ValueExpr>
  );
}
```

### Usage Examples

**Basic:**
```typescript
import { parseEval } from "@astrolabe-evaluator";
import { evaluateReactive, createReactiveData } from "@astrolabe-evaluator/reactive";

const data = createReactiveData({ x: 10, y: 20 });
const expr = parseEval('x + y');
const result = evaluateReactive(expr, data);

console.log(result.value.value);  // 30
data.fields.x.value = 15;
console.log(result.value.value);  // 35
```

**Form Validation:**
```typescript
const formData = createReactiveData({
  email: "",
  password: "",
  confirmPassword: ""
});

const emailValid = parseAndEvaluateReactive(
  'email != null and $contains(email, "@")',
  formData
);

const passwordsMatch = parseAndEvaluateReactive(
  'password = confirmPassword',
  formData
);

// Use in UI
emailInput.addEventListener('input', (e) => {
  formData.fields.email.value = e.target.value;
  // emailValid.value updates automatically
  showError(!emailValid.value.value);
});
```

**Computed Fields:**
```typescript
const order = createReactiveData({
  quantity: 1,
  pricePerUnit: 10.00,
  taxRate: 0.08
});

const subtotal = parseAndEvaluateReactive('quantity * pricePerUnit', order);
const tax = parseAndEvaluateReactive('$subtotal * taxRate', order);
const total = parseAndEvaluateReactive('$subtotal + $tax', order);

// All update automatically when order changes
order.fields.quantity.value = 3;
console.log(total.value.value);  // 32.40
```

## Testing Strategy

### Unit Tests

**File:** `test/reactiveEvaluate.test.ts`

1. **Basic Reactive Evaluation**
   - Simple expressions update correctly
   - Multiple dependencies tracked
   - Non-dependencies don't trigger updates

2. **Conditional Dependencies**
   - Subscriptions change based on execution path
   - Unused branches don't subscribe
   - Re-subscription works when condition changes

3. **Let Bindings**
   - All bindings re-evaluate on dependency change
   - Environment threading preserved
   - Errors accumulate correctly

4. **Complex Expressions**
   - Nested objects
   - Array operations
   - Function calls

5. **Cleanup**
   - Subscriptions removed on cleanup
   - No memory leaks

### Integration Tests

**File:** `test/reactiveIntegration.test.ts`

1. **Form Validation**
   - Multiple validation rules
   - Cross-field validation
   - Dynamic validation rules

2. **Computed Fields**
   - Cascading updates
   - Circular dependency detection
   - Performance with many computed fields

3. **Large Data Sets**
   - Arrays with many elements
   - Deep object nesting
   - Performance benchmarks

### Performance Tests

**File:** `test/reactivePerformance.test.ts`

1. **Subscription Overhead**
   - Memory usage
   - CPU usage
   - Comparison with static evaluation

2. **Batch Updates**
   - groupedChanges efficiency
   - Transaction batching

3. **Cleanup Efficiency**
   - Subscription removal
   - Memory leak detection

## Migration Path

### For Existing Users

**Option 1: Gradual Adoption**
```typescript
// Keep existing static evaluation
const staticResult = evaluate(expr, plainData);

// Add reactive for dynamic parts
const reactiveResult = evaluateReactive(expr, controlData);
```

**Option 2: Wrapper for Compatibility**
```typescript
// Adapt existing code with minimal changes
function adaptToReactive<T>(
  evalFunc: (data: T) => any,
  initialData: T
): Control<any> {
  const dataControl = createReactiveData(initialData);
  const result = newControl(null);

  updateComputedValue(result, () => {
    return evalFunc(dataControl.value);
  });

  return result;
}

// Use existing evaluation logic
const result = adaptToReactive(
  (data) => evaluate(myExpr, data),
  initialData
);
```

### Breaking Changes

**None!** The reactive system is an addition, not a replacement.

- Static evaluation still works exactly the same
- No changes to existing APIs
- Reactive features are opt-in

## Trade-offs

### When to Use Reactive Evaluation

✅ **Use Reactive When:**
- Data changes frequently
- Multiple derived values depend on same data
- Building interactive UIs (forms, dashboards)
- Want automatic propagation of changes
- Complex dependency graphs

### When to Use Static Evaluation

✅ **Use Static When:**
- One-time evaluation
- Data doesn't change
- Performance-critical code (avoid subscription overhead)
- Simple scripts or batch processing
- Pure computation (no side effects)

### Performance Characteristics

| Aspect | Static | Reactive |
|--------|--------|----------|
| **Initial Evaluation** | Fast | Slower (subscription setup) |
| **Re-evaluation** | Manual | Automatic (only on change) |
| **Memory** | Low | Higher (subscriptions) |
| **CPU (idle)** | None | Low (event handling) |
| **CPU (updates)** | Manual trigger | Automatic (efficient) |
| **Complexity** | Simple | Complex |

## Open Questions

### 1. Circular Dependencies

**Question:** How to handle circular reactive dependencies?

```typescript
const data = createReactiveData({ a: 1, b: 2 });

// This could create infinite loop:
updateComputedValue(data.fields.a, () => data.fields.b.value + 1);
updateComputedValue(data.fields.b, () => data.fields.a.value + 1);
```

**Options:**
- Detect cycles and throw error
- Limit recursion depth
- Use transaction batching to prevent infinite loops

### 2. Async Expressions

**Question:** How to handle async operations in expressions?

```typescript
const expr = parseEval('await $fetch(apiUrl)');
```

**Options:**
- Use AsyncEffect instead of Effect
- Return Promise<ValueExpr>
- Add async function support to evaluator

### 3. Performance at Scale

**Question:** How many reactive expressions can we support efficiently?

**Need to test:**
- 100+ reactive expressions
- 1000+ data fields
- 10,000+ updates per second

### 4. Error Propagation

**Question:** How to handle errors in reactive updates?

**Options:**
- Set errors on result control
- Emit error events
- Use error boundaries

### 5. Type Safety

**Question:** How to preserve type safety with reactive evaluation?

**Options:**
- Use TypeScript generics for data types
- Type inference from initial data
- Runtime type checking

## Implementation Checklist

### Phase 1: Foundation
- [ ] Add @astrolabe-controls to dependencies
- [ ] Create ReactiveEvalData interface
- [ ] Create ReactiveEvalEnv class
- [ ] Write basic tests for control-based evaluation

### Phase 2: Reactive API
- [ ] Implement evaluateReactive function
- [ ] Implement parseAndEvaluateReactive function
- [ ] Implement createReactiveData helper
- [ ] Write tests for basic reactive updates

### Phase 3: Conditional Dependencies
- [ ] Test conditional expression tracking
- [ ] Verify dynamic subscription updates
- [ ] Test re-subscription on condition changes

### Phase 4: Let Bindings
- [ ] Verify let bindings work with reactive
- [ ] Test environment threading
- [ ] Test error accumulation

### Phase 5: Hybrid Tracking
- [ ] Implement dependency validation
- [ ] Add development mode warnings
- [ ] Document static vs runtime deps

### Phase 6: Form Integration
- [ ] Create form integration examples
- [ ] Document computed field patterns
- [ ] Test with real form scenarios

### Phase 7: Performance
- [ ] Add batching support
- [ ] Implement cleanup utilities
- [ ] Profile and optimize hot paths
- [ ] Write performance tests

### Documentation
- [ ] API documentation
- [ ] Usage guide
- [ ] Migration guide
- [ ] Performance guide
- [ ] Examples and recipes

## Success Criteria

1. **Correctness**
   - All tests pass
   - No memory leaks
   - Errors handled properly

2. **Performance**
   - < 10% overhead vs static for simple expressions
   - Scales to 100+ reactive expressions
   - Efficient subscription management

3. **Usability**
   - Simple API
   - Clear documentation
   - Good error messages

4. **Compatibility**
   - Works with existing code
   - No breaking changes
   - Smooth migration path

## References

- [DEPENDENCY-TRACKING.md](./DEPENDENCY-TRACKING.md) - Current dependency system
- [USAGE-TRACKING-DESIGN.md](./USAGE-TRACKING-DESIGN.md) - Type checker and scope tracking
- @astrolabe-controls source code - Reactive system implementation
- Astrolabe.Validation (C#) - Environment threading patterns

## Conclusion

Reactive re-evaluation brings automatic updates to the evaluator while maintaining:
- **Correctness** through eager evaluation and environment threading
- **Efficiency** through fine-grained dependency tracking
- **Simplicity** through automatic subscription management
- **Compatibility** through opt-in adoption

The key insight: **Reactivity is orthogonal to lazy evaluation**. We get efficiency through automatic re-evaluation (only when dependencies change) rather than deferred evaluation (only when accessed).

This preserves the evaluator's correctness while adding powerful reactive capabilities for interactive applications.
