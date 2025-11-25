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
        if (currentValue == null || currentValue is not ValueExpr ve)
        {
            return ValueExpr.WithError(null, $"Property {pe.Property} cannot be accessed without data");
        }

        var propResult = GetPropertyFromValue(ve, pe.Property);

        // Propagate parent's dependencies to the property value
        if (propResult is ValueExpr propValue && ve.Deps != null && ve.Deps.Any())
        {
            var combinedDeps = new List<ValueExpr>();
            combinedDeps.AddRange(ve.Deps);
            if (propValue.Deps != null) combinedDeps.AddRange(propValue.Deps);
            return EvaluateExpr(propValue with { Deps = combinedDeps });
        }

        return EvaluateExpr(propResult);
    }

    private EvalExpr EvaluateArrayExpr(ArrayExpr ae)
    {
        var results = ae.Values.Select(v => EvaluateExpr(v)).ToList();
        // All results should be ValueExpr in full evaluation
        return new ValueExpr(new ArrayValue(results.Cast<ValueExpr>()));
    }

    private static EvalExpr GetPropertyFromValue(ValueExpr value, string property)
    {
        return value.Value switch
        {
            ObjectValue ov when ov.Properties.TryGetValue(property, out var propVal) => propVal,
            _ => ValueExpr.Null
        };
    }
}
