using System.Collections.Concurrent;

namespace Astrolabe.Evaluator;

/// <summary>
/// Full evaluation environment with lazy variable memoization.
/// Mirrors TypeScript's BasicEvalEnv.
/// </summary>
public class BasicEvalEnv(
    IReadOnlyDictionary<string, EvalExpr> localVars,
    BasicEvalEnv? parent,
    Func<object?, object?, int> compare
) : EvalEnv
{
    private readonly IDictionary<string, EvalExpr> _evalCache =
        new ConcurrentDictionary<string, EvalExpr>();

    public override int Compare(object? v1, object? v2) => compare(v1, v2);

    public override BasicEvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars)
    {
        return vars.Count == 0 ? this : new BasicEvalEnv(vars, this, compare);
    }

    public override EvalExpr? GetCurrentValue()
    {
        return localVars.ContainsKey("_")
            ? EvaluateVariable("_", new VarExpr("_"))
            : parent?.GetCurrentValue();
    }

    private EvalExpr EvaluateVariable(string name, EvalExpr sourceExpr)
    {
        // Check local scope first
        if (!localVars.TryGetValue(name, out var binding))
            return parent != null
                ? parent.EvaluateVariable(name, sourceExpr)
                : sourceExpr.WithError($"Variable ${name} not declared");
        if (_evalCache.TryGetValue(name, out var cached))
            return cached;

        var result = EvaluateExpr(binding);
        _evalCache[name] = result;
        return result;
    }

    public override EvalExpr EvaluateExpr(EvalExpr expr)
    {
        return expr switch
        {
            VarExpr ve => EvaluateVariable(ve.Name, ve),
            LetExpr le => EvaluateLetExpr(le),
            ValueExpr v => v,
            CallExpr ce => EvaluateCallExpr(ce),
            PropertyExpr pe => EvaluatePropertyExpr(pe),
            ArrayExpr ae => EvaluateArrayExpr(ae),
            LambdaExpr le => le.WithError("Lambda expressions cannot be evaluated directly"),
            _ => throw new ArgumentOutOfRangeException(nameof(expr)),
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
        var funcExpr = EvaluateVariable(ce.Function, ce);
        return funcExpr is not ValueExpr { Value: FunctionHandler handler }
            ? ce.WithError($"Function ${ce.Function} not declared or not a function")
            : handler(this, ce);
    }

    private EvalExpr EvaluatePropertyExpr(PropertyExpr pe)
    {
        var currentValue = GetCurrentValue();
        if (currentValue == null || currentValue is not ValueExpr ve)
        {
            return pe.WithError($"Property {pe.Property} cannot be accessed without data");
        }

        var propResult = GetPropertyFromValue(ve, pe.Property);

        // Propagate parent's dependencies to the property value
        if (ve.Deps == null || !ve.Deps.Any())
            return EvaluateExpr(propResult);
        var combinedDeps = new List<ValueExpr>();
        combinedDeps.AddRange(ve.Deps);
        if (propResult.Deps != null)
            combinedDeps.AddRange(propResult.Deps);
        return EvaluateExpr(propResult with { Deps = combinedDeps });
    }

    private EvalExpr EvaluateArrayExpr(ArrayExpr ae)
    {
        var results = ae.Values.Select(EvaluateExpr).ToList();
        // All results should be ValueExpr in full evaluation
        return new ValueExpr(new ArrayValue(results.Cast<ValueExpr>()));
    }
}
