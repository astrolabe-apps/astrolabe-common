namespace Astrolabe.Evaluator;

public static class PartialEvaluation
{
    /// <summary>
    /// Simplify a let expression by performing:
    /// 1. Dead code elimination (remove unused variables)
    /// 2. Constant propagation (inline simple values)
    /// 3. Let flattening (remove empty let expressions)
    /// </summary>
    public static EvalExpr SimplifyLet(
        IEnumerable<(VarExpr, EvalExpr)> partialBindings,
        EvalExpr bodyResult,
        SourceLocation? location = null
    )
    {
        var bindingsList = partialBindings.ToList();

        // Step 1: Find all variables used in the body
        var usedVars = FreeVariables(bodyResult);

        // Step 2: Fixed-point iteration for transitive dependencies
        // Variables used by other used variables are also needed
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var (varExpr, partialResult) in bindingsList)
            {
                if (!usedVars.Contains(varExpr.Name)) continue;
                var bindingVars = FreeVariables(partialResult);
                foreach (var bindingVar in bindingVars.Where(bindingVar => !usedVars.Contains(bindingVar)))
                {
                    usedVars.Add(bindingVar);
                    changed = true;
                }
            }
        }

        // Step 3: Separate relevant bindings from inlinable ones
        var relevantBindings = new List<(VarExpr, EvalExpr)>();
        var inlineBindings = new Dictionary<string, EvalExpr>();

        foreach (var (varExpr, partialResult) in bindingsList)
        {
            if (!usedVars.Contains(varExpr.Name))
            {
                continue; // Dead code elimination
            }

            // Constant propagation - inline simple values
            if (partialResult is ValueExpr ve && IsSimpleValue(ve.Value))
            {
                inlineBindings[varExpr.Name] = partialResult;
            }
            else
            {
                relevantBindings.Add((varExpr, partialResult));
            }
        }

        // Step 4: Apply inlining to body
        var simplifiedBody = bodyResult;
        foreach (var (varName, replacement) in inlineBindings)
        {
            simplifiedBody = Substitute(simplifiedBody, varName, replacement);
        }

        // Step 5: Apply inlining to remaining bindings
        for (var i = 0; i < relevantBindings.Count; i++)
        {
            var (varExpr, bindingExpr) = relevantBindings[i];
            var simplifiedBinding = bindingExpr;
            foreach (var (varName, replacement) in inlineBindings)
            {
                simplifiedBinding = Substitute(simplifiedBinding, varName, replacement);
            }
            relevantBindings[i] = (varExpr, simplifiedBinding);
        }

        // Step 6: Let flattening - if no bindings remain, return the body
        return relevantBindings.Count == 0 ? simplifiedBody : new LetExpr(relevantBindings, simplifiedBody, location);
    }

    /// <summary>
    /// Find all free (unbound) variable references in an expression
    /// </summary>
    public static HashSet<string> FreeVariables(EvalExpr expr, HashSet<string>? bound = null)
    {
        bound ??= [];
        var free = new HashSet<string>();

        Visit(expr, bound);
        return free;

        void Visit(EvalExpr e, HashSet<string> boundVars)
        {
            while (true)
            {
                switch (e)
                {
                    case VarExpr ve:
                        if (!boundVars.Contains(ve.Name))
                        {
                            free.Add(ve.Name);
                        }

                        break;

                    case ValueExpr:
                    case PropertyExpr:
                        // No variables
                        break;

                    case CallExpr ce:
                        foreach (var arg in ce.Args)
                        {
                            Visit(arg, boundVars);
                        }

                        break;

                    case ArrayExpr ae:
                        foreach (var value in ae.Values)
                        {
                            Visit(value, boundVars);
                        }

                        break;

                    case LetExpr le:
                        // Variables bound in this let
                        var newBound = new HashSet<string>(boundVars);
                        foreach (var (varExpr, _) in le.Vars)
                        {
                            newBound.Add(varExpr.Name);
                        }

                        // Visit bindings with current scope
                        foreach (var (_, bindingExpr) in le.Vars)
                        {
                            Visit(bindingExpr, boundVars);
                        }

                        // Visit body with extended scope
                        e = le.In;
                        boundVars = newBound;
                        continue;

                    case LambdaExpr lambdaExpr:
                        var lambdaBound = new HashSet<string>(boundVars) { lambdaExpr.Variable };
                        e = lambdaExpr.Value;
                        boundVars = lambdaBound;
                        continue;
                }

                break;
            }
        }
    }

    /// <summary>
    /// Substitute all occurrences of a variable with a replacement expression
    /// Respects shadowing (doesn't replace in scopes where the variable is rebound)
    /// </summary>
    public static EvalExpr Substitute(EvalExpr expr, string varName, EvalExpr replacement)
    {
        return expr switch
        {
            VarExpr ve when ve.Name == varName => replacement,
            VarExpr ve => ve,
            ValueExpr v => v,
            PropertyExpr p => p,

            CallExpr ce => ce with { Args = ce.Args.Select(a => Substitute(a, varName, replacement)).ToList() },

            ArrayExpr ae => ae with { Values = ae.Values.Select(v => Substitute(v, varName, replacement)) },

            LetExpr le =>
                // Check if variable is shadowed in this let
                le.Vars.Any(v => v.Item1.Name == varName)
                    ? le // Shadowed, don't substitute
                    : le with
                    {
                        Vars = le.Vars.Select(v => (v.Item1, Substitute(v.Item2, varName, replacement))),
                        In = Substitute(le.In, varName, replacement)
                    },

            LambdaExpr lambdaExpr when lambdaExpr.Variable == varName => lambdaExpr, // Shadowed
            LambdaExpr lambdaExpr => lambdaExpr with { Value = Substitute(lambdaExpr.Value, varName, replacement) },

            _ => expr
        };
    }

    /// <summary>
    /// Determine if a value is simple enough to inline during constant propagation
    /// Simple values: null, booleans, small numbers, short strings
    /// </summary>
    private static bool IsSimpleValue(object? value)
    {
        return value switch
        {
            null => true,
            bool => true,
            int => true,
            long l => l is >= -1000 and <= 1000,
            double d => d is >= -1000 and <= 1000,
            string s => s.Length <= 20,
            _ => false
        };
    }
}
