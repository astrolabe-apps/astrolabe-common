# Plan: Port TypeScript EvalEnv to C#

## Overview

Port the TypeScript `EvalEnv`, `BasicEvalEnv`, and `PartialEvalEnv` architecture to C# without modifying the existing `Interpreter.cs`, `EvalEnvironment.cs`, or `PartialEvaluation.cs` files. This enables gradual migration while both systems coexist.

## Phase 1: Backwards-Compatible Changes to EvalExpr

### 1.1 Add `Data` and `Location` Properties to EvalExpr Interface

Add `Data` and `Location` properties to the `EvalExpr` interface itself. Since all expression types already have `SourceLocation? Location`, and we're adding `object? Data` to all of them, this simplifies access via the interface.

**File: `Astrolabe.Evaluator/EvalExpr.cs`**

```csharp
public interface EvalExpr
{
    /// <summary>
    /// Source location for error reporting and debugging.
    /// </summary>
    SourceLocation? Location { get; }

    /// <summary>
    /// Generic metadata property for internal use by evaluation environments.
    /// Used for tracking inlined variables (InlineData) and other metadata.
    /// </summary>
    object? Data { get; }
}
```

Then add `object? Data = null` parameter to each record type (all already have `Location`):
- `ValueExpr` - add `object? Data = null` parameter
- `VarExpr` - add `object? Data = null` parameter
- `CallExpr` - add `object? Data = null` parameter
- `ArrayExpr` - add `object? Data = null` parameter
- `LetExpr` - add `object? Data = null` parameter
- `PropertyExpr` - add `object? Data = null` parameter
- `LambdaExpr` - add `object? Data = null` parameter

This is backwards-compatible since all parameters have default values.

### 1.2 Add `Errors` Property to ValueExpr

Add an optional `IEnumerable<string>? Errors` property to `ValueExpr` to match TypeScript's error handling approach where errors are attached to the result value rather than tracked in environment state.

**File: `Astrolabe.Evaluator/EvalExpr.cs`**

```csharp
public record ValueExpr(
    object? Value,
    DataPath? Path = null,
    IEnumerable<ValueExpr>? Deps = null,
    SourceLocation? Location = null,
    object? Data = null,
    IEnumerable<string>? Errors = null  // NEW: TypeScript-style error tracking
) : EvalExpr
{
    // Add helper for creating error values
    public static ValueExpr WithError(object? value, string error)
    {
        return new ValueExpr(value, Errors: [error]);
    }

    public static ValueExpr WithErrors(object? value, IEnumerable<string> errors)
    {
        return new ValueExpr(value, Errors: errors);
    }
}
```

### 1.3 Add `FunctionHandler2` Delegate

Create a new function handler type that mirrors TypeScript's `FunctionValue.eval` signature, returning `EvalExpr` directly (not wrapped in `EnvironmentValue`).

**File: `Astrolabe.Evaluator/EvalExpr.cs`** (or new file `FunctionHandler2.cs`)

```csharp
/// <summary>
/// Function handler that mirrors TypeScript's FunctionValue.eval signature.
/// Takes an EvalEnv and CallExpr, returns EvalExpr directly.
/// Used by the new EvalEnv-based evaluation system.
/// </summary>
public delegate EvalExpr FunctionHandler2(EvalEnv env, CallExpr call);
```

## Phase 2: Create Abstract EvalEnv Base Class

**File: `Astrolabe.Evaluator/EvalEnv.cs`** (new file)

```csharp
namespace Astrolabe.Evaluator;

/// <summary>
/// Abstract base class for evaluation environments.
/// Mirrors TypeScript's EvalEnv abstract class.
/// </summary>
public abstract class EvalEnv
{
    /// <summary>
    /// Compare two values for ordering.
    /// </summary>
    public abstract int Compare(object? v1, object? v2);

    /// <summary>
    /// Create a new child scope with variable bindings.
    /// Variables are stored unevaluated and evaluated lazily on first access.
    /// </summary>
    public abstract EvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars);

    /// <summary>
    /// Evaluate an expression and return the result.
    /// - BasicEvalEnv: Returns ValueExpr (full evaluation)
    /// - PartialEvalEnv: Returns EvalExpr (may be symbolic)
    /// </summary>
    public abstract EvalExpr EvaluateExpr(EvalExpr expr);

    /// <summary>
    /// Get the current data context value (bound to _ variable).
    /// Returns null if no data context is available.
    /// </summary>
    public abstract EvalExpr? GetCurrentValue();

    /// <summary>
    /// Attach dependencies to a ValueExpr result.
    /// Filters to only ValueExpr deps and merges with existing.
    /// </summary>
    public ValueExpr WithDeps(ValueExpr result, IEnumerable<EvalExpr> deps)
    {
        var valueDeps = deps.OfType<ValueExpr>().ToList();
        if (valueDeps.Count == 0) return result;

        var existingDeps = result.Deps?.ToList() ?? [];
        var allDeps = existingDeps.Concat(valueDeps);

        return result with { Deps = allDeps };
    }
}
```

## Phase 3: Implement BasicEvalEnv

**File: `Astrolabe.Evaluator/BasicEvalEnv.cs`** (new file)

```csharp
namespace Astrolabe.Evaluator;

/// <summary>
/// Full evaluation environment with lazy variable memoization.
/// Mirrors TypeScript's BasicEvalEnv.
/// </summary>
public class BasicEvalEnv : EvalEnv
{
    private readonly IReadOnlyDictionary<string, EvalExpr> _localVars;
    private readonly Dictionary<string, EvalExpr> _evalCache = new();
    private readonly BasicEvalEnv? _parent;
    private readonly Func<object?, object?, int> _compare;

    public BasicEvalEnv(
        IReadOnlyDictionary<string, EvalExpr> localVars,
        BasicEvalEnv? parent,
        Func<object?, object?, int> compare)
    {
        _localVars = localVars;
        _parent = parent;
        _compare = compare;
    }

    public override int Compare(object? v1, object? v2) => _compare(v1, v2);

    public override EvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars)
    {
        if (vars.Count == 0) return this;
        return new BasicEvalEnv(vars, this, _compare);
    }

    public override EvalExpr? GetCurrentValue()
    {
        if (_localVars.ContainsKey("_"))
            return EvaluateVariable("_");
        return _parent?.GetCurrentValue();
    }

    private EvalExpr EvaluateVariable(string name, SourceLocation? location = null)
    {
        // Check local scope first
        if (_localVars.ContainsKey(name))
        {
            if (_evalCache.TryGetValue(name, out var cached))
                return cached;

            var binding = _localVars[name];
            var result = EvaluateExpr(binding);
            _evalCache[name] = result;
            return result;
        }

        // Delegate to parent
        if (_parent != null)
            return _parent.EvaluateVariable(name, location);

        // Error: unknown variable
        return ValueExpr.WithError(null, $"Variable ${name} not declared");
    }

    public override EvalExpr EvaluateExpr(EvalExpr expr)
    {
        return expr switch
        {
            VarExpr ve => EvaluateVariable(ve.Name, ve.Location),

            LetExpr le => EvaluateLetExpr(le),

            ValueExpr v => v,

            CallExpr ce => EvaluateCallExpr(ce),

            PropertyExpr pe => EvaluatePropertyExpr(pe),

            ArrayExpr ae => EvaluateArrayExpr(ae),

            LambdaExpr => ValueExpr.WithError(null, "Lambda expressions cannot be evaluated directly"),

            _ => throw new ArgumentOutOfRangeException(nameof(expr))
        };
    }

    private EvalExpr EvaluateLetExpr(LetExpr le)
    {
        // Create scope with unevaluated bindings
        var bindings = new Dictionary<string, EvalExpr>();
        foreach (var (varExpr, bindingExpr) in le.Vars)
        {
            bindings[varExpr.Name] = bindingExpr;
        }
        return NewScope(bindings).EvaluateExpr(le.In);
    }

    private EvalExpr EvaluateCallExpr(CallExpr ce)
    {
        var funcExpr = EvaluateVariable(ce.Function, ce.Location);
        if (funcExpr is not ValueExpr { Value: FunctionHandler2 handler })
        {
            return ValueExpr.WithError(null, $"Function ${ce.Function} not declared or not a function");
        }
        return handler(this, ce);
    }

    private EvalExpr EvaluatePropertyExpr(PropertyExpr pe)
    {
        var currentValue = GetCurrentValue();
        if (currentValue == null || currentValue is not ValueExpr)
        {
            return ValueExpr.WithError(null, $"Property {pe.Property} cannot be accessed without data");
        }
        // Get property from current value - implementation depends on data structure
        return EvaluateExpr(GetPropertyFromValue((ValueExpr)currentValue, pe.Property));
    }

    private EvalExpr EvaluateArrayExpr(ArrayExpr ae)
    {
        var results = ae.Values.Select(v => EvaluateExpr(v)).ToList();
        // All results should be ValueExpr in full evaluation
        return new ValueExpr(new ArrayValue(results.Cast<ValueExpr>()));
    }

    private static EvalExpr GetPropertyFromValue(ValueExpr value, string property)
    {
        // Implementation depends on how properties are accessed
        // This would typically use JsonDataLookup or similar
        return value.Value switch
        {
            ObjectValue ov when ov.Properties.TryGetValue(property, out var propVal) => propVal,
            _ => ValueExpr.Null
        };
    }
}
```

## Phase 4: Implement PartialEvalEnv2

**File: `Astrolabe.Evaluator/PartialEvalEnv2.cs`** (new file)

```csharp
namespace Astrolabe.Evaluator;

/// <summary>
/// Metadata for tracking inlined variables.
/// Internal to the evaluation system.
/// </summary>
internal record InlineData(string InlinedFrom, int ScopeId);

/// <summary>
/// Partial evaluation environment that returns symbolic expressions for unknowns.
/// Mirrors TypeScript's PartialEvalEnv.
/// </summary>
public class PartialEvalEnv2 : EvalEnv
{
    private static int _nextScopeId = 0;

    private readonly IReadOnlyDictionary<string, EvalExpr> _localVars;
    private readonly Dictionary<string, EvalExpr> _evalCache = new();
    private readonly PartialEvalEnv2? _parent;
    private readonly Func<object?, object?, int> _compare;
    public readonly int ScopeId;

    public PartialEvalEnv2(
        IReadOnlyDictionary<string, EvalExpr> localVars,
        PartialEvalEnv2? parent,
        Func<object?, object?, int> compare)
    {
        _localVars = localVars;
        _parent = parent;
        _compare = compare;
        ScopeId = Interlocked.Increment(ref _nextScopeId);
    }

    public override int Compare(object? v1, object? v2) => _compare(v1, v2);

    public override EvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars)
    {
        if (vars.Count == 0) return this;
        return new PartialEvalEnv2(vars, this, _compare);
    }

    public override EvalExpr? GetCurrentValue()
    {
        if (_localVars.ContainsKey("_"))
            return EvaluateVariable("_");
        return _parent?.GetCurrentValue();
    }

    private EvalExpr EvaluateVariable(string name)
    {
        // Check local scope
        if (_localVars.ContainsKey(name))
        {
            if (_evalCache.TryGetValue(name, out var cached))
                return cached;

            var binding = _localVars[name];

            // Detect self-reference
            if (binding is VarExpr ve && ve.Name == name)
                return binding;

            var result = EvaluateExpr(binding);

            // Tag with inline data for uninlining (internal use)
            // Access Data directly via EvalExpr interface
            if (result.Data == null)
            {
                result = SetData(result, new InlineData(name, ScopeId));
            }

            _evalCache[name] = result;
            return result;
        }

        // Delegate to parent
        if (_parent != null)
            return _parent.EvaluateVariable(name);

        // Unknown variable - return VarExpr unchanged (partial evaluation)
        return new VarExpr(name);
    }

    // Helper to set Data on any EvalExpr (uses 'with' expression on records)
    private static EvalExpr SetData(EvalExpr expr, object? data) => expr switch
    {
        ValueExpr v => v with { Data = data },
        VarExpr vr => vr with { Data = data },
        CallExpr c => c with { Data = data },
        ArrayExpr a => a with { Data = data },
        LetExpr l => l with { Data = data },
        PropertyExpr p => p with { Data = data },
        LambdaExpr lm => lm with { Data = data },
        _ => expr
    };

    public override EvalExpr EvaluateExpr(EvalExpr expr)
    {
        return expr switch
        {
            VarExpr ve => EvaluateVariable(ve.Name),

            LetExpr le => EvaluateLetPartial(le),

            ValueExpr v => v,

            CallExpr ce => EvaluateCallPartial(ce),

            PropertyExpr pe => EvaluatePropertyPartial(pe),

            ArrayExpr ae => EvaluateArrayPartial(ae),

            LambdaExpr => expr, // Keep lambda unchanged

            _ => throw new ArgumentOutOfRangeException(nameof(expr))
        };
    }

    private EvalExpr EvaluateLetPartial(LetExpr le)
    {
        var bindings = new Dictionary<string, EvalExpr>();
        foreach (var (varExpr, bindingExpr) in le.Vars)
        {
            bindings[varExpr.Name] = bindingExpr;
        }
        return NewScope(bindings).EvaluateExpr(le.In);
    }

    private EvalExpr EvaluateCallPartial(CallExpr ce)
    {
        var funcExpr = EvaluateVariable(ce.Function);
        if (funcExpr is not ValueExpr { Value: FunctionHandler2 handler })
        {
            // Unknown function - return CallExpr unchanged
            return ce;
        }
        return handler(this, ce);
    }

    private EvalExpr EvaluatePropertyPartial(PropertyExpr pe)
    {
        var currentValue = GetCurrentValue();
        if (currentValue == null || currentValue is not ValueExpr)
        {
            // No current data or not fully evaluated - return PropertyExpr unchanged
            return pe;
        }
        return EvaluateExpr(GetPropertyFromValue((ValueExpr)currentValue, pe.Property));
    }

    private EvalExpr EvaluateArrayPartial(ArrayExpr ae)
    {
        var partialValues = ae.Values.Select(v => EvaluateExpr(v)).ToList();

        // Check if all elements are fully evaluated
        if (partialValues.All(v => v is ValueExpr))
        {
            return new ValueExpr(new ArrayValue(partialValues.Cast<ValueExpr>()));
        }

        // At least one element is symbolic - return ArrayExpr
        return new ArrayExpr(partialValues);
    }

    private static EvalExpr GetPropertyFromValue(ValueExpr value, string property)
    {
        return value.Value switch
        {
            ObjectValue ov when ov.Properties.TryGetValue(property, out var propVal) => propVal,
            _ => ValueExpr.Null
        };
    }

    /// <summary>
    /// Reconstruct let bindings for expressions that appear multiple times.
    /// </summary>
    public EvalExpr Uninline(EvalExpr expr, int complexityThreshold = 1, int minOccurrences = 2)
    {
        // Collect tagged expressions and count occurrences
        var tagged = new Dictionary<string, (EvalExpr Expr, int Count, int Complexity, string VarName)>();
        CollectTaggedExprs(expr, tagged);

        // Filter candidates
        var toUninline = new Dictionary<string, string>(); // compositeKey -> actualVarName
        var usedNames = new HashSet<string>();

        foreach (var (key, info) in tagged)
        {
            if (info.Count >= minOccurrences && info.Complexity >= complexityThreshold)
            {
                var varName = info.VarName;
                if (usedNames.Contains(varName))
                {
                    var i = 1;
                    while (usedNames.Contains($"{varName}_{i}")) i++;
                    varName = $"{varName}_{i}";
                }
                usedNames.Add(varName);
                toUninline[key] = varName;
            }
        }

        if (toUninline.Count == 0) return expr;

        // Replace tagged expressions with variable references
        var replaced = ReplaceTaggedWithVars(expr, toUninline);

        // Build let expression with bindings
        var bindings = new List<(VarExpr, EvalExpr)>();
        foreach (var (key, info) in tagged)
        {
            if (toUninline.TryGetValue(key, out var varName))
            {
                bindings.Add((new VarExpr(varName), RemoveTag(info.Expr)));
            }
        }

        return new LetExpr(bindings, replaced);
    }

    private void CollectTaggedExprs(EvalExpr expr, Dictionary<string, (EvalExpr, int, int, string)> tagged)
    {
        // Implementation to walk expression tree and collect tagged expressions
        // ...
    }

    private EvalExpr ReplaceTaggedWithVars(EvalExpr expr, Dictionary<string, string> toUninline)
    {
        // Implementation to replace tagged expressions with variable references
        // ...
        return expr;
    }

    private static EvalExpr RemoveTag(EvalExpr expr) => SetData(expr, null!);
}
```

## Phase 5: Create FunctionHandler2 Wrappers

**File: `Astrolabe.Evaluator/Functions/DefaultFunctions2.cs`** (new file)

Create `FunctionHandler2` versions of the default functions that work with the new `EvalEnv` API.

```csharp
namespace Astrolabe.Evaluator.Functions;

public static class DefaultFunctions2
{
    /// <summary>
    /// Create a FunctionHandler2 from an evaluation function.
    /// </summary>
    public static FunctionHandler2 CreateFunction(
        Func<EvalEnv, CallExpr, EvalExpr> evaluate)
    {
        return evaluate;
    }

    /// <summary>
    /// Binary function that evaluates both args and applies operation.
    /// Returns symbolic CallExpr if either arg is not fully evaluated.
    /// </summary>
    public static FunctionHandler2 BinFunction(
        string name,
        Func<object, object, EvalEnv, object?> evaluate)
    {
        return (env, call) =>
        {
            if (call.Args.Count != 2)
                return ValueExpr.WithError(null, $"{name} expects 2 arguments");

            var left = env.EvaluateExpr(call.Args[0]);
            var right = env.EvaluateExpr(call.Args[1]);

            if (left is ValueExpr lv && right is ValueExpr rv)
            {
                if (lv.Value == null || rv.Value == null)
                    return env.WithDeps(new ValueExpr(null), [left, right]);

                return env.WithDeps(
                    new ValueExpr(evaluate(lv.Value, rv.Value, env)),
                    [left, right]);
            }

            // Return symbolic call
            return new CallExpr(name, [left, right]);
        };
    }

    /// <summary>
    /// Comparison function with partial evaluation support.
    /// </summary>
    public static FunctionHandler2 ComparisonFunction(string name, Func<int, bool> toResult)
    {
        return BinFunction(name, (a, b, env) => toResult(env.Compare(a, b)));
    }

    /// <summary>
    /// Number operator with partial evaluation support.
    /// </summary>
    public static FunctionHandler2 NumberOp(
        string name,
        Func<double, double, double> doubleOp,
        Func<long, long, long> longOp)
    {
        return BinFunction(name, (o1, o2, _) =>
        {
            if (ValueExpr.MaybeInteger(o1) is { } l1 && ValueExpr.MaybeInteger(o2) is { } l2)
            {
                return longOp(l1, l2);
            }
            return doubleOp(ValueExpr.AsDouble(o1), ValueExpr.AsDouble(o2));
        });
    }

    public static IReadOnlyDictionary<string, FunctionHandler2> FunctionHandlers2 = new Dictionary<string, FunctionHandler2>
    {
        { "+", NumberOp("+", (a, b) => a + b, (a, b) => a + b) },
        { "-", NumberOp("-", (a, b) => a - b, (a, b) => a - b) },
        { "*", NumberOp("*", (a, b) => a * b, (a, b) => a * b) },
        { "/", NumberOp("/", (a, b) => a / b, (a, b) => (double)a / b) },
        { "%", NumberOp("%", (a, b) => a % b, (a, b) => (double)a % b) },
        { "=", ComparisonFunction("=", v => v == 0) },
        { "!=", ComparisonFunction("!=", v => v != 0) },
        { "<", ComparisonFunction("<", x => x < 0) },
        { "<=", ComparisonFunction("<=", x => x <= 0) },
        { ">", ComparisonFunction(">", x => x > 0) },
        { ">=", ComparisonFunction(">=", x => x >= 0) },
        // ... more functions to be added
    };
}
```

## Phase 6: Factory Methods

**File: `Astrolabe.Evaluator/EvalEnv.cs`** (add to existing)

```csharp
public static class EvalEnvFactory
{
    /// <summary>
    /// Create a BasicEvalEnv with root data and default functions.
    /// </summary>
    public static BasicEvalEnv CreateBasicEnv(
        object? root = null,
        IReadOnlyDictionary<string, EvalExpr>? functions = null)
    {
        var vars = new Dictionary<string, EvalExpr>();

        // Add functions
        if (functions != null)
        {
            foreach (var (name, expr) in functions)
                vars[name] = expr;
        }

        // Add root data as _ variable
        if (root != null)
        {
            vars["_"] = JsonDataLookup.ToValue(root);
        }

        return new BasicEvalEnv(
            vars,
            null,
            EvalEnvironment.CompareSignificantDigits(5));
    }

    /// <summary>
    /// Create a PartialEvalEnv2 with default functions.
    /// </summary>
    public static PartialEvalEnv2 CreatePartialEnv(
        IReadOnlyDictionary<string, EvalExpr>? functions = null,
        ValueExpr? current = null)
    {
        var vars = new Dictionary<string, EvalExpr>();

        if (functions != null)
        {
            foreach (var (name, expr) in functions)
                vars[name] = expr;
        }

        if (current != null)
            vars["_"] = current;

        return new PartialEvalEnv2(
            vars,
            null,
            EvalEnvironment.CompareSignificantDigits(5));
    }
}
```

## File Summary

### Files to Create:
1. `Astrolabe.Evaluator/EvalEnv.cs` - Abstract base class + factory methods
2. `Astrolabe.Evaluator/BasicEvalEnv.cs` - Full evaluation implementation
3. `Astrolabe.Evaluator/PartialEvalEnv2.cs` - Partial evaluation implementation
4. `Astrolabe.Evaluator/Functions/DefaultFunctions2.cs` - FunctionHandler2 versions

### Files to Modify:
1. `Astrolabe.Evaluator/EvalExpr.cs` - Add `Data` property to record types, add `Errors` property to `ValueExpr`, add `FunctionHandler2` delegate

### Files NOT Modified (as requested):
- `Astrolabe.Evaluator/Interpreter.cs`
- `Astrolabe.Evaluator/EvalEnvironment.cs`
- `Astrolabe.Evaluator/PartialEvaluation.cs`

## Implementation Order

1. **Phase 1**: Add `Data` property, `Errors` property, and `FunctionHandler2` to `EvalExpr.cs`
2. **Phase 2**: Create `EvalEnv.cs` with abstract base class
3. **Phase 3**: Implement `BasicEvalEnv.cs`
4. **Phase 4**: Implement `PartialEvalEnv2.cs`
5. **Phase 5**: Create `DefaultFunctions2.cs` with FunctionHandler2 wrappers
6. **Phase 6**: Add factory methods to `EvalEnv.cs`

## Key Design Decisions

- **FunctionHandler2** stored in `ValueExpr.Value` (same as existing `FunctionHandler`)
- **InlineData** is internal (not exposed externally)
- **Errors** attached to `ValueExpr` (TypeScript approach, not environment state)
- **Gradual migration** - new classes coexist with existing ones

## Testing Strategy

- Update existing test helper classes to use the new `EvalEnv` classes instead of `EvalEnvironment`
- Run existing test suite to verify the new implementation produces identical results
- This validates both full evaluation (`BasicEvalEnv`) and partial evaluation (`PartialEvalEnv2`) against proven test cases
