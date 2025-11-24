namespace Astrolabe.Evaluator;

using EvaluatedExprValue = EnvironmentValue<ValueExpr>;

public static class Interpreter
{
    public static EvaluatedExprValue Evaluate(this EnvironmentValue<EvalExpr> envExpr)
    {
        return envExpr.Env.Evaluate(envExpr.Value);
    }

    public static EvaluatedExprValue EvaluateWith(
        this EvalEnvironment environment,
        ValueExpr baseValue,
        int? index,
        EvalExpr expr
    )
    {
        return environment.EvaluateWithValue(baseValue, ValueExpr.From(index), expr);
    }

    public static EvaluatedExprValue EvaluateWithValue(
        this EvalEnvironment environment,
        ValueExpr baseValue,
        ValueExpr bindValue,
        EvalExpr expr
    )
    {
        var (e, toEval) = expr switch
        {
            LambdaExpr { Variable: var name, Value: var valExpr }
                => environment
                    .WithVariables([new KeyValuePair<string, EvalExpr>(name, bindValue),])
                    .WithValue(valExpr),
            _ => environment.WithValue(expr)
        };
        var (resultEnv, resultExpr) = e.WithCurrent(baseValue).EvaluateExpr(toEval);
        if (resultExpr is not ValueExpr valueExpr)
        {
            throw new InvalidOperationException(
                $"EvaluateWithValue() expected ValueExpr but got {resultExpr.GetType().Name}. " +
                $"This function requires full evaluation and cannot be used with PartialEvalEnvironment."
            );
        }
        return resultEnv.WithCurrent(e.Current).WithValue(valueExpr);
    }

    /// <summary>
    /// Full evaluation that fails immediately with errors for unknown variables/functions.
    /// Based on main branch DefaultEvaluate implementation.
    /// Used by EvalEnvironment base class for immediate, precise error reporting.
    /// </summary>
    public static EnvironmentValue<EvalExpr> DefaultFullEvaluateExpr(
        this EvalEnvironment environment,
        EvalExpr expr
    )
    {
        return expr switch
        {
            ArrayExpr arrayExpr
                => environment
                    .EvalSelect(arrayExpr.Values, (e, x) => e.EvaluateExpr(x))
                    .Map(x => (EvalExpr)new ValueExpr(new ArrayValue(x.Cast<ValueExpr>()))),

            LetExpr le
                => environment
                    .WithVariables(
                        le.Vars.Select(x => new KeyValuePair<string, EvalExpr>(
                                x.Item1.Name,
                                x.Item2
                            ))
                            .ToList()
                    )
                    .EvaluateExpr(le.In),

            VarExpr ve when environment.GetVariable(ve.Name) is var v
                => v != null
                    ? environment.EvaluateExpr(v)
                    : environment.WithError("Variable $" + ve.Name + " not declared").WithValue<EvalExpr>(ValueExpr.Null),

            ValueExpr v => environment.WithValue<EvalExpr>(v),

            CallExpr { Function: var func, Args: var args } callExpr
                when environment.GetVariable(func) is ValueExpr { Value: FunctionHandler handler }
                => handler.Evaluate(environment, callExpr).Map<EvalExpr>(v => v),

            CallExpr ce
                => environment.WithError("Function $" + ce.Function + " not declared").WithValue<EvalExpr>(ValueExpr.Null),

            PropertyExpr { Property: var dp }
                when environment.Data != null && environment.Current != null
                => environment.EvaluateExpr(environment.GetProperty(dp)),

            PropertyExpr pe
                => environment.WithError($"Property {pe.Property} cannot be accessed without data").WithValue<EvalExpr>(ValueExpr.Null),

            _ => throw new ArgumentOutOfRangeException(expr?.ToString())
        };
    }

    public static EvaluatedExprValue DefaultEvaluate(
        this EvalEnvironment environment,
        EvalExpr expr
    )
    {
        var (env, result) = environment.DefaultPartialEvaluateExpr(expr);

        return result switch
        {
            ValueExpr v => env.WithValue(v),
            VarExpr ve => env.WithError($"Variable ${ve.Name} not declared").WithNull(),
            CallExpr ce => env.WithError($"Function ${ce.Function} not declared").WithNull(),
            PropertyExpr pe => env.WithError($"Property {pe.Property} could not be accessed").WithNull(),
            _ => env.WithError("Expression could not be fully evaluated").WithNull()
        };
    }

    /// <summary>
    /// Partial evaluation that returns symbolic expressions for unknown variables/functions.
    /// Used by PartialEvalEnvironment for symbolic computation and deferred evaluation.
    /// </summary>
    public static EnvironmentValue<EvalExpr> DefaultPartialEvaluateExpr(
        this EvalEnvironment environment,
        EvalExpr expr
    )
    {
        return expr switch
        {
            ValueExpr v => environment.WithValue<EvalExpr>(v),

            VarExpr ve when environment.GetVariable(ve.Name) is var varExpr
                => varExpr != null
                    ? environment.EvaluateExpr(varExpr)
                    : environment.WithValue<EvalExpr>(ve),  // Return VarExpr unchanged for unknown variables

            PropertyExpr pe => environment.WithValue<EvalExpr>(environment.GetProperty(pe.Property)),

            CallExpr { Function: var func } callExpr
                when environment.GetVariable(func) is ValueExpr { Value: FunctionHandler handler }
                => handler.Evaluate(environment, callExpr).Map<EvalExpr>(v => v),

            CallExpr ce => environment.WithValue<EvalExpr>(ce),  // Return CallExpr unchanged for unknown functions

            ArrayExpr arrayExpr => EvaluateArrayPartial(environment, arrayExpr),

            LetExpr le => EvaluateLetPartial(environment, le),

            _ => throw new ArgumentOutOfRangeException(expr?.ToString())
        };
    }

    private static EnvironmentValue<EvalExpr> EvaluateArrayPartial(
        EvalEnvironment environment,
        ArrayExpr arrayExpr
    )
    {
        var (envAfter, partialValues) = environment.EvalSelect(
            arrayExpr.Values,
            (e, x) => e.EvaluateExpr(x)
        );

        var allFullyEvaluated = partialValues.All(v => v is ValueExpr);

        if (allFullyEvaluated)
        {
            return envAfter.WithValue<EvalExpr>(
                new ValueExpr(new ArrayValue(partialValues.Cast<ValueExpr>()))
            );
        }

        return envAfter.WithValue<EvalExpr>(new ArrayExpr(partialValues));
    }

    private static EnvironmentValue<EvalExpr> EvaluateLetPartial(
        EvalEnvironment environment,
        LetExpr letExpr
    )
    {
        var currentEnv = environment;
        var keptBindings = new List<(VarExpr, EvalExpr)>();
        var inlineBindings = System.Collections.Immutable.ImmutableDictionary<string, EvalExpr>.Empty.ToBuilder();

        foreach (var (varExpr, bindingExpr) in letExpr.Vars)
        {
            var (nextEnv, partialBinding) = currentEnv.EvaluateExpr(bindingExpr);

            // Only inline simple values and variables
            if (IsInlinableExpr(partialBinding))
            {
                inlineBindings[varExpr.Name] = partialBinding;
                // Create environment with current bindings for subsequent expressions
                // Preserve the evaluation mode by using the original environment's type
                currentEnv = environment is PartialEvalEnvironment
                    ? new PartialLetEvaluationEnvironment(
                        nextEnv.State with
                        {
                            LocalVariables = inlineBindings.ToImmutable(),
                            Parent = environment.State
                        }
                    )
                    : new LetEvaluationEnvironment(
                        nextEnv.State with
                        {
                            LocalVariables = inlineBindings.ToImmutable(),
                            Parent = environment.State
                        }
                    );
            }
            else
            {
                keptBindings.Add((varExpr, partialBinding));
                currentEnv = nextEnv;
            }
        }

        var (bodyEnv, bodyResult) = currentEnv.EvaluateExpr(letExpr.In);

        // If body is fully evaluated and no bindings remain, return the value
        if (bodyResult is ValueExpr && keptBindings.Count == 0)
        {
            return bodyEnv.WithValue(bodyResult);
        }

        // Return a simplified let expression
        return bodyEnv.WithValue<EvalExpr>(
            PartialEvaluation.SimplifyLet(keptBindings, bodyResult, letExpr.Location)
        );
    }

    /// <summary>
    /// Special environment for let expression evaluation that doesn't force full evaluation of variables
    /// </summary>
    private class LetEvaluationEnvironment : EvalEnvironment
    {
        public LetEvaluationEnvironment(EvalEnvironmentState state) : base(state)
        {
        }
    }

    /// <summary>
    /// Partial evaluation version of LetEvaluationEnvironment
    /// </summary>
    private class PartialLetEvaluationEnvironment : PartialEvalEnvironment
    {
        public PartialLetEvaluationEnvironment(EvalEnvironmentState state) : base(state)
        {
        }
    }

    private static bool IsInlinableExpr(EvalExpr expr)
    {
        return expr is ValueExpr or VarExpr;
    }
}
