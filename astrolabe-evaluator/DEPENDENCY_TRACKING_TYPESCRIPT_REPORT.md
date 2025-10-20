# TypeScript Evaluator Dependency Tracking Test Results

**Date:** 2025-10-20 (Updated)
**Test File:** `test/dependencyTracking.test.ts`
**Total Tests:** 21
**Passing:** 16
**Failing:** 5

## Executive Summary

After fixing the lambda syntax from `->` to `=>`, the TypeScript evaluator dependency tracking tests show **significant improvement**. The implementation now passes **16/21 tests (76%)**, up from the previously reported 8/21. The core array operations (map, filter, first) are now working correctly. Only 5 tests remain failing, primarily related to precise element tracking and conditional operator dependency tracking.

## Test Results by Category

### ✅ Passing Tests (16/21)

#### Parameter Binding Tests (3/3) ✅
1. **Map lambda variable is element value**
   - Test: `$map(nums, $x => $x * 2)`
   - Result: [2, 4, 6] ✅

2. **Filter lambda variable is index, use $this for element**
   - Test: `nums[$i => $i >= 2]` and `nums[$i => $this() > 25]`
   - Results: Both work correctly ✅

3. **First lambda variable is index, use $this for element**
   - Test: `$first(items, $i => $i >= 2)`
   - Result: "c" ✅

#### Lazy Dependency Model Tests (2/2) ✅
4. **Map preserves dependencies in individual elements**
   - Each element correctly has its own dependency ✅

5. **Filter preserves dependencies in filtered elements**
   - Filtered elements preserve source dependencies ✅

#### Dependency Aggregation Tests (2/3) ✅❌
6. **Sum aggregates dependencies from all elements** ✅
7. **First tracks dependencies from evaluated elements** ✅

#### Pipeline Tests (2/3) ✅❌
8. **Map then sum aggregates dependencies correctly** ✅
   - Test: `$sum($map(values, $x => $x * 2))`
   - Result: 12 with correct deps ✅

9. **Filter then sum only tracks filtered elements** ✅
   - Test: `$sum(scores[$i => $this() >= 70])`
   - Result: 250 with correct filtered deps ✅

#### Basic Operation Tests (4/4) ✅
10. **Arithmetic operations track dependencies** (a + b) ✅
11. **Comparison operations track dependencies** (x < y) ✅
12. **Boolean AND tracks dependencies from all evaluated args** ✅
13. **Boolean AND short-circuits and tracks only evaluated** ✅

#### String Operations Tests (2/2) ✅
14. **String concatenation tracks dependencies** ✅
15. **Lower tracks dependencies** ✅

#### Utility Functions Tests (1/2) ✅❌
16. **Null coalesce tracks dependencies from first non-null** ✅

### ❌ Failing Tests (5/21)

#### 1. Elem Precision Tracking (2 failures)

**Test: Elem tracks only accessed element**
```typescript
const expr = parseEval("$elem(items, 1)");
// Expected deps: ["items.1"]
// Actual deps: ["items"]
```
**Issue:** Tracks entire array instead of specific element index.

**Test: Map then elem only tracks accessed element**
```typescript
const expr = parseEval("$elem($map(items, $x => $x * 2), 1)");
// Expected deps: ["items.1"]
// Actual deps: ["items"]
```
**Issue:** Same issue - tracks whole array rather than precise element.

**Root Cause:** The `elem` function uses `evalFunction` which aggregates dependencies from all arguments, including the entire array. It should be rewritten to track only the accessed element.

#### 2. Conditional Operator Dependency Tracking (2 failures)

**Test: Conditional should track only taken branch**
```typescript
const expr = parseEval("cond ? thenVal : elseVal");
// Expected deps: ["cond", "thenVal"]
// Actual deps: ["thenVal"]
```
**Issue:** Missing condition dependency. Only tracks the result branch, not the condition itself.

**Test: Conditional with complex condition should track only taken branch**
```typescript
const expr = parseEval("age >= minAge ? adult : minor");
// Expected deps: ["age", "minAge", "adult"]
// Actual deps: ["adult"]
```
**Issue:** Missing all condition dependencies (age, minAge). Only tracks the result value.

**Root Cause:** The conditional operator evaluates the condition but doesn't preserve its dependencies when returning the result. The implementation needs to use `valueExprWithDeps` to include the condition's dependencies.

#### 3. Which Function Dependency Tracking (1 failure)

**Test: Which tracks dependencies**
```typescript
const expr = parseEval('$which(status, "pending", pendingMsg, "active", activeMsg)');
// Expected deps: ["status", "pendingMsg"]
// Actual deps: ["status"]
```
**Issue:** Doesn't track the returned value's dependencies, only the condition.

**Root Cause:** Line 192 in defaultFunctions.ts:
```typescript
return mapEnv(nextEnv.evaluate(value), (v) =>
  valueExprWithDeps(v.value, [cond, compValue]),  // BUG: Should include v in deps!
);
```

**Fix:**
```typescript
return mapEnv(nextEnv.evaluate(value), (v) =>
  valueExprWithDeps(v.value, [cond, compValue, v]),  // Include v's dependencies
);
```

## Comparison with C# Implementation

| Feature | C# Status | TypeScript Status | Notes |
|---------|-----------|-------------------|-------|
| map() element deps | ✅ Working | ✅ Working | **FIXED** |
| filter() deps | ✅ Working | ✅ Working | **FIXED** |
| first() | ✅ Working | ✅ Working | **FIXED** |
| elem() precise tracking | ✅ Working | ❌ Tracks whole array | HIGH priority |
| Conditional (?) deps | ❌ Tracks both branches | ❌ Missing condition deps | Different bug |
| which() value deps | ❌ Known bug | ❌ Same bug | MEDIUM priority |
| sum() aggregation | ✅ Working | ✅ Working | N/A |
| Basic operations | ✅ Working | ✅ Working | N/A |

### C# Tests: 19/22 Passing (86%)
- Working: sum, elem, map, filter, first, arithmetic, comparison, boolean, strings
- Known Bugs (3): conditional (?) tracks both branches, which() missing value deps

### TypeScript Tests: 16/21 Passing (76%)
- Working: sum, map, filter, first, arithmetic, comparison, boolean, strings, null coalesce
- Failing (5): elem() precision (2 tests), conditional (?) deps (2 tests), which() (1 test)

## Key Improvements Since Last Report

The lambda syntax fix (`->` to `=>`) resolved **critical issues**:
1. ✅ **map() now works** - Previously returned null, now returns correct values with deps
2. ✅ **filter() now works** - Previously returned empty arrays, now filters correctly
3. ✅ **first() now works** - Previously returned null, now finds elements
4. ✅ **Lazy evaluation** - Map and filter preserve dependencies in elements

**Test pass rate improved from 38% to 76%** (8/21 → 16/21)

## Remaining Issues Summary

### Priority 1 (HIGH - Correctness)
1. **elem() precision tracking** - Rewrite to track only accessed element, not whole array
2. **Conditional (?) dependency tracking** - Include condition dependencies in result

### Priority 2 (MEDIUM - Consistency with C#)
3. **which() value dependencies** - Include returned value's dependencies (same bug as C#)

## Recommended Fixes

### 1. Fix elem() Precision Tracking

Current implementation uses `evalFunction` which aggregates all argument dependencies. Need a custom implementation:

```typescript
elem: functionValue(
  (env, call) => {
    if (call.args.length !== 2) {
      return [env.withError("elem expects 2 arguments"), NullExpr];
    }
    const [arrayExpr, indexExpr] = call.args;
    const [arrEnv, arrayVal] = env.evaluate(arrayExpr);
    const [idxEnv, indexVal] = arrEnv.evaluate(indexExpr);

    if (!Array.isArray(arrayVal.value)) {
      return [idxEnv.withError("elem requires an array"), NullExpr];
    }

    const index = indexVal.value as number;
    const elem = (arrayVal.value as ValueExpr[])[index];
    return [idxEnv, elem ?? NullExpr];  // Return the element with its deps
  },
  (e, call) =>
    mapCallArgs(call, e, (args) =>
      isArrayType(args[0]) ? getElementType(args[0]) : AnyType,
    ),
),
```

### 2. Fix Conditional (?) Dependency Tracking

The conditional operator needs to preserve condition dependencies:

```typescript
const condFunction = functionValue(
  (env: EvalEnv, call: CallExpr) => {
    if (call.args.length !== 3) {
      return [env.withError("? expects 3 arguments"), NullExpr];
    }
    const [condExpr, thenExpr, elseExpr] = call.args;
    const [condEnv, condVal] = env.evaluate(condExpr);

    if (condVal.value === true) {
      return mapEnv(condEnv.evaluate(thenExpr), (thenVal) =>
        valueExprWithDeps(thenVal.value, [condVal, thenVal])  // Include condition deps
      );
    } else if (condVal.value === false) {
      return mapEnv(condEnv.evaluate(elseExpr), (elseVal) =>
        valueExprWithDeps(elseVal.value, [condVal, elseVal])  // Include condition deps
      );
    }
    return [condEnv, NullExpr];
  },
  constGetType(AnyType),
);
```

### 3. Fix which() Value Dependencies

Simple one-line fix in defaultFunctions.ts around line 192:

```typescript
// Change from:
return mapEnv(nextEnv.evaluate(value), (v) =>
  valueExprWithDeps(v.value, [cond, compValue]),
);

// To:
return mapEnv(nextEnv.evaluate(value), (v) =>
  valueExprWithDeps(v.value, [cond, compValue, v]),
);
```

## Next Steps

1. ✅ **Lambda syntax fixed** - Changed `->` to `=>` throughout test file
2. Apply the three recommended fixes above
3. Re-run tests to verify all 21 tests pass
4. Update C# implementation if needed to match TypeScript improvements
5. Consider aligning conditional operator behavior between C# and TypeScript

## Related Files

- Test file: `/home/doolse/astrolabe/astrolabe-common/astrolabe-evaluator/test/dependencyTracking.test.ts`
- Implementation: `/home/doolse/astrolabe/astrolabe-common/astrolabe-evaluator/src/defaultFunctions.ts`
- C# test file: `/home/doolse/astrolabe/astrolabe-common/Astrolabe.Evaluator.Test/DependencyTrackingTests.cs`
- C# report: `/home/doolse/astrolabe/astrolabe-common/Astrolabe.Evaluator.Test/DEPENDENCY_TRACKING_REPORT.md`

## Conclusion

The TypeScript evaluator is now in **good shape** with 76% of tests passing. The remaining 5 failures are well-understood and have clear fix paths. The lambda syntax correction was the critical fix that resolved the major map/filter/first issues. With the three recommended fixes applied, the TypeScript implementation should achieve parity with the C# version.