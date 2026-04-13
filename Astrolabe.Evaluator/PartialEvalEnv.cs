using System.Collections.Concurrent;

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
public class PartialEvalEnv : EvalEnv
{
    private static int _nextScopeId;

    private readonly IReadOnlyDictionary<string, EvalExpr> _localVars;
    private readonly IDictionary<string, EvalExpr> _evalCache =
        new ConcurrentDictionary<string, EvalExpr>();
    private readonly PartialEvalEnv? _parent;
    private readonly Func<object?, object?, int> _compare;

    /// <summary>
    /// Unique identifier for this scope, used for tracking variable shadowing during uninlining.
    /// </summary>
    public int ScopeId { get; }

    public PartialEvalEnv(
        IReadOnlyDictionary<string, EvalExpr> localVars,
        PartialEvalEnv? parent,
        Func<object?, object?, int> compare
    )
    {
        _localVars = localVars;
        _parent = parent;
        _compare = compare;
        ScopeId = Interlocked.Increment(ref _nextScopeId);
    }

    public override int Compare(object? v1, object? v2) => _compare(v1, v2);

    public override PartialEvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars)
    {
        return vars.Count == 0 ? this : new PartialEvalEnv(vars, this, _compare);
    }

    public override EvalExpr? GetCurrentValue()
    {
        return _localVars.ContainsKey("_") ? EvaluateVariable("_") : _parent?.GetCurrentValue();
    }

    // Sentinel value to detect circular evaluation
    private static readonly EvalExpr EvaluatingSentinel = new VarExpr("__evaluating__");

    private EvalExpr EvaluateVariable(string name)
    {
        // Check local scope
        if (_localVars.TryGetValue(name, out var binding))
        {
            if (_evalCache.TryGetValue(name, out var cached))
            {
                // If we hit the sentinel, we have a circular reference - return as VarExpr
                return ReferenceEquals(cached, EvaluatingSentinel) ? new VarExpr(name) : cached;
            }

            // Detect self-reference to prevent infinite recursion
            if (binding is VarExpr ve && ve.Name == name)
                return binding;

            // Set sentinel before evaluating to detect cycles
            _evalCache[name] = EvaluatingSentinel;

            var result = EvaluateExpr(binding);

            // Tag with inline data for uninlining (internal use)
            if (!result.HasData(InlineDataKey))
            {
                result = result.WithData(InlineDataKey, new InlineData(name, ScopeId));
            }

            _evalCache[name] = result;
            return result;
        }

        // Delegate to parent
        return _parent != null ? _parent.EvaluateVariable(name) : new VarExpr(name); // Unknown variable - return VarExpr unchanged (partial evaluation)
    }

    private const string InlineDataKey = "inline";

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
            _ => throw new ArgumentOutOfRangeException(nameof(expr)),
        };
    }

    private EvalExpr EvaluateLetPartial(LetExpr le)
    {
        // Create scope with unevaluated bindings
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
        return funcExpr is not ValueExpr { Value: FunctionHandler handler }
            ? ce // Unknown function - return CallExpr unchanged
            : handler(this, ce);
    }

    private EvalExpr EvaluatePropertyPartial(PropertyExpr pe)
    {
        var currentValue = GetCurrentValue();
        if (currentValue == null || currentValue is not ValueExpr ve)
        {
            // No current data or not fully evaluated - return PropertyExpr unchanged
            return pe;
        }
        return EvaluateExpr(GetPropertyFromValue(ve, pe.Property));
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

    /// <summary>
    /// Reconstruct let bindings for expressions that appear multiple times.
    /// Uses composite keys (scopeId:varName) to correctly handle variable shadowing.
    /// </summary>
    public EvalExpr Uninline(EvalExpr expr, int complexityThreshold = 1, int minOccurrences = 2)
    {
        // Collect tagged expressions and count occurrences
        var tagged =
            new Dictionary<string, (EvalExpr Expr, int Count, int Complexity, string VarName)>();
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
                    while (usedNames.Contains($"{varName}_{i}"))
                        i++;
                    varName = $"{varName}_{i}";
                }
                usedNames.Add(varName);
                toUninline[key] = varName;
            }
        }

        if (toUninline.Count == 0)
            return expr;

        // Replace tagged expressions with variable references
        var replaced = ReplaceTaggedWithVars(expr, toUninline);

        // Build let expression with bindings
        // Process bindings in order, replacing tags within each binding's expression
        // This ensures that if $c uses $applicable, and both are being uninlined,
        // $applicable within $c's definition gets replaced with a variable reference
        var bindings = new List<(VarExpr, EvalExpr)>();
        foreach (var (key, info) in tagged)
        {
            if (toUninline.TryGetValue(key, out var varName))
            {
                // Replace any tagged expressions within this binding's expression
                var replacedExpr = ReplaceTaggedWithVars(RemoveTag(info.Expr), toUninline);
                bindings.Add((new VarExpr(varName), replacedExpr));
            }
        }

        return new LetExpr(bindings, replaced);
    }

    private static void CollectTaggedExprs(
        EvalExpr expr,
        Dictionary<string, (EvalExpr Expr, int Count, int Complexity, string VarName)> tagged
    )
    {
        // Check if this expression has inline data
        if (expr.GetData<InlineData>(InlineDataKey) is { } inlineData)
        {
            var key = $"{inlineData.ScopeId}:{inlineData.InlinedFrom}";
            var complexity = CalculateComplexity(expr);

            if (tagged.TryGetValue(key, out var existing))
            {
                tagged[key] = (
                    existing.Expr,
                    existing.Count + 1,
                    existing.Complexity,
                    existing.VarName
                );
            }
            else
            {
                tagged[key] = (expr, 1, complexity, inlineData.InlinedFrom);
            }
        }

        // Recursively collect from children
        switch (expr)
        {
            case CallExpr ce:
                foreach (var arg in ce.Args)
                    CollectTaggedExprs(arg, tagged);
                break;
            case ArrayExpr ae:
                foreach (var v in ae.Values)
                    CollectTaggedExprs(v, tagged);
                break;
            case LetExpr le:
                foreach (var (_, bindingExpr) in le.Vars)
                    CollectTaggedExprs(bindingExpr, tagged);
                CollectTaggedExprs(le.In, tagged);
                break;
            case LambdaExpr lm:
                CollectTaggedExprs(lm.Value, tagged);
                break;
        }
    }

    private static int CalculateComplexity(EvalExpr expr)
    {
        return expr switch
        {
            ValueExpr { Value: ArrayValue av } => av.Values.Count(),
            ValueExpr { Value: ObjectValue ov } => ov.Properties.Count,
            ValueExpr or VarExpr or PropertyExpr => 1,
            CallExpr ce => 1 + ce.Args.Sum(CalculateComplexity),
            ArrayExpr ae => 1 + ae.Values.Sum(CalculateComplexity),
            LetExpr le => 1
                + le.Vars.Sum(v => CalculateComplexity(v.Item2))
                + CalculateComplexity(le.In),
            LambdaExpr lm => 1 + CalculateComplexity(lm.Value),
            _ => 1,
        };
    }

    private static EvalExpr ReplaceTaggedWithVars(
        EvalExpr expr,
        Dictionary<string, string> toUninline
    )
    {
        // Check if this expression should be replaced with a variable reference
        if (expr.GetData<InlineData>(InlineDataKey) is { } inlineData)
        {
            var key = $"{inlineData.ScopeId}:{inlineData.InlinedFrom}";
            if (toUninline.TryGetValue(key, out var varName))
            {
                return new VarExpr(varName);
            }
        }

        // Recursively replace in children
        return expr switch
        {
            CallExpr ce => ce with
            {
                Args = ce.Args.Select(a => ReplaceTaggedWithVars(a, toUninline)).ToList(),
            },
            ArrayExpr ae => ae with
            {
                Values = ae.Values.Select(v => ReplaceTaggedWithVars(v, toUninline)),
            },
            LetExpr le => le with
            {
                Vars = le.Vars.Select(v => (v.Item1, ReplaceTaggedWithVars(v.Item2, toUninline))),
                In = ReplaceTaggedWithVars(le.In, toUninline),
            },
            LambdaExpr lm => lm with { Value = ReplaceTaggedWithVars(lm.Value, toUninline) },
            _ => expr,
        };
    }

    private static EvalExpr RemoveTag(EvalExpr expr) => expr.WithoutData(InlineDataKey);
}
