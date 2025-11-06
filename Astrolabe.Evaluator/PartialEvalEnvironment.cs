using System.Collections.Immutable;

namespace Astrolabe.Evaluator;

/// <summary>
/// Specialized environment for partial evaluation that distinguishes between
/// compile-time values (variables) and runtime fields (properties).
/// </summary>
public class PartialEvalEnvironment : EvalEnvironment
{
    public PartialEvalEnvironment(EvalEnvironmentState state)
        : base(state) { }

    /// <summary>
    /// Override EvaluateExpr - main implementation for partial evaluation.
    /// Handles all expression types, returning partially-evaluated results.
    /// </summary>
    public override EnvironmentValue<EvalExpr> EvaluateExpr(EvalExpr evalExpr)
    {
        switch (evalExpr)
        {
            case ValueExpr ve:
                return this.WithValue(ve);

            case VarExpr ve:
                // Try to substitute with compile-time value if known
                var varValue = GetVariable(ve.Name);
                return varValue != null
                    ? EvaluateExpr(varValue)  // Recursively evaluate
                    : this.WithValue(ve);      // Keep as runtime variable

            case PropertyExpr pe:
                // Only evaluate if we have data context
                return HasDataContext()
                    ? this.WithValue(GetProperty(pe.Property))
                    : this.WithValue(pe);  // Keep as runtime property

            case CallExpr ce:
                // If function exists, call handler directly; else return CallExpr unchanged
                if (GetVariable(ce.Function) is ValueExpr { Value: FunctionHandler handler })
                    return handler.Evaluate(this, ce);
                return this.WithValue(ce);  // Unknown function - keep as partial CallExpr

            case LetExpr le:
                // Evaluate all bindings and add to environment
                var newEnv = this;
                var bindings = new Dictionary<string, EvalExpr>();

                foreach (var (varExpr, binding) in le.Vars)
                {
                    var (nextEnv, evaluated) = newEnv.EvaluateExpr(binding);
                    bindings[varExpr.Name] = evaluated;
                    newEnv = (PartialEvalEnvironment)nextEnv.WithVariable(varExpr.Name, evaluated);
                }

                // Evaluate body with extended environment
                var (finalEnv, body) = newEnv.EvaluateExpr(le.In);

                // Collect free variables in the result
                var freeVars = CollectFreeVars(body);
                var neededBindings = bindings
                    .Where(kvp => freeVars.Contains(kvp.Key) && kvp.Value is not ValueExpr)
                    .Select(kvp => (new VarExpr(kvp.Key), kvp.Value))
                    .ToList();

                // Return body alone if no partial bindings needed, else wrap in LetExpr
                return neededBindings.Count == 0
                    ? finalEnv.WithValue(body)
                    : finalEnv.WithValue<EvalExpr>(new LetExpr(neededBindings, body));

            case ArrayExpr ae:
                // Evaluate all elements
                var (envAfterArray, elements) = this.EvalSelect(ae.Values, (e, x) => e.EvaluateExpr(x));

                // If all elements are ValueExpr, return a ValueExpr array
                if (elements.All(e => e is ValueExpr))
                    return envAfterArray.WithValue(new ValueExpr(new ArrayValue(elements.Cast<ValueExpr>())));

                // Otherwise keep as ArrayExpr
                return envAfterArray.WithValue(new ArrayExpr(elements));

            case LambdaExpr le:
                // Keep lambda as-is (parameters are unknown at compile-time)
                return this.WithValue(le);

            default:
                throw new InvalidOperationException(
                    $"PartialEvalEnvironment.EvaluateExpr cannot handle expression type: {evalExpr.GetType().Name}"
                );
        }
    }

    /// <summary>
    /// Collect free variables in an expression (variables not bound by lambda/let in that expression).
    /// Handles scoping correctly - lambda and let bindings shadow outer variables.
    /// </summary>
    private static HashSet<string> CollectFreeVars(EvalExpr expr, HashSet<string>? boundVars = null)
    {
        boundVars ??= new HashSet<string>();
        var freeVars = new HashSet<string>();

        void Collect(EvalExpr e, HashSet<string> bound)
        {
            switch (e)
            {
                case VarExpr ve when !bound.Contains(ve.Name):
                    freeVars.Add(ve.Name);
                    break;

                case LambdaExpr le:
                    // Lambda parameter shadows outer variables
                    var innerBound = new HashSet<string>(bound) { le.Variable };
                    Collect(le.Value, innerBound);
                    break;

                case LetExpr le:
                    // Let bindings shadow outer variables
                    var letBound = new HashSet<string>(bound);
                    foreach (var (v, _) in le.Vars)
                        letBound.Add(v.Name);

                    // Binding expressions see outer scope
                    foreach (var (_, binding) in le.Vars)
                        Collect(binding, bound);

                    // Body sees let-bound variables
                    Collect(le.In, letBound);
                    break;

                case CallExpr ce:
                    foreach (var arg in ce.Args)
                        Collect(arg, bound);
                    break;

                case ArrayExpr ae:
                    foreach (var val in ae.Values)
                        Collect(val, bound);
                    break;

                case ValueExpr ve when ve.Value is ArrayValue av:
                    foreach (var val in av.Values)
                        Collect(val, bound);
                    break;

                case ValueExpr ve when ve.Value is ObjectValue ov:
                    foreach (var kvp in ov.Properties)
                        Collect(kvp.Value, bound);
                    break;

                case PropertyExpr:
                case ValueExpr:
                    // No variables to collect
                    break;
            }
        }

        Collect(expr, boundVars);
        return freeVars;
    }

    /// <summary>
    /// Convenience method for partial evaluation - evaluates and returns just the result.
    /// </summary>
    public EvalExpr PartialEvaluate(EvalExpr expr)
    {
        var (_, result) = this.EvaluateExpr(expr);
        return result;
    }

    /// <summary>
    /// Override Evaluate() to throw error - partial eval should use EvaluateExpr.
    /// </summary>
    public override EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
    {
        throw new InvalidOperationException(
            "Use EvaluateExpr() for partial evaluation. " +
            "Evaluate() is only for standard full evaluation."
        );
    }

    /// <summary>
    /// Check if a variable is defined in the environment (compile-time value).
    /// </summary>
    public bool HasVariable(string name)
    {
        var current = State;
        while (current != null)
        {
            if (current.LocalVariables.ContainsKey(name))
                return true;
            current = current.Parent;
        }
        return false;
    }

    /// <summary>
    /// Check if there is any data context (for PropertyExpr evaluation).
    /// Returns false if current value is Undefined or null (no data context).
    /// </summary>
    public bool HasDataContext()
    {
        var current = State.Current;
        // If current value is Undefined or null, there's no data context
        return current != ValueExpr.Undefined && current.Value != null;
    }

    /// <summary>
    /// Try to get a variable value if it exists.
    /// Returns null if the variable is not found.
    /// </summary>
    public ValueExpr? TryGetVariable(string name)
    {
        var expr = State.LookupVariable(name);
        return expr as ValueExpr;
    }

    /// <summary>
    /// Override NewEnv to return PartialEvalEnvironment instances.
    /// </summary>
    protected override EvalEnvironment NewEnv(EvalEnvironmentState newState)
    {
        return new PartialEvalEnvironment(newState);
    }

    /// <summary>
    /// Override WithVariable to not evaluate the variable value.
    /// In partial evaluation, we want to keep the raw EvalExpr.
    /// </summary>
    public override EvalEnvironment WithVariable(string name, EvalExpr value)
    {
        // Don't evaluate - just add the value as-is
        return NewEnv(
            State with
            {
                LocalVariables = State.LocalVariables.Add(name, value),
                Parent = State
            }
        );
    }

    /// <summary>
    /// Override WithVariables to not evaluate variable values.
    /// In partial evaluation, we want to keep the raw EvalExpr.
    /// </summary>
    public override EvalEnvironment WithVariables(ICollection<KeyValuePair<string, EvalExpr>> vars)
    {
        if (vars.Count == 0)
        {
            return this;
        }

        if (vars.Count == 1)
        {
            var single = vars.First();
            return WithVariable(single.Key, single.Value);
        }

        // Don't evaluate - just add all values as-is
        var newVars = vars.ToImmutableDictionary(kvp => kvp.Key, kvp => kvp.Value);
        return NewEnv(
            State with
            {
                LocalVariables = newVars,
                Parent = State
            }
        );
    }
}
