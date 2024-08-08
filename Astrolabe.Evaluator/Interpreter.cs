namespace Astrolabe.Evaluator;

using EvaluatedExprValue = EnvironmentValue<ValueExpr>;

public static class Interpreter
{
    public static EvaluatedExprValue Evaluate(this EnvironmentValue<EvalExpr> envExpr)
    {
        return envExpr.Env.Evaluate(envExpr.Value);
    }

    public static EvaluatedExprValue EvaluateElem(
        this EvalEnvironment environment,
        ValueExpr baseValue,
        int index,
        EvalExpr expr
    )
    {
        return expr switch
        {
            LambdaExpr { Variable: var name, Value: var valExpr }
                => environment
                    .WithVariables(
                        [
                            new KeyValuePair<string, EvalExpr>(name, ValueExpr.From(index)),
                            new KeyValuePair<string, EvalExpr>(name + "_elem", baseValue)
                        ]
                    )
                    .WithBasePath(baseValue.Path ?? environment.BasePath)
                    .Evaluate(valExpr)
                    .EnvMap(x => x.WithBasePath(environment.BasePath)),
            _ when baseValue.Path is { } bp
                => environment
                    .WithBasePath(bp)
                    .Evaluate(expr)
                    .EnvMap(x => x.WithBasePath(environment.BasePath)),
            _ => throw new ArgumentException("Need a path")
        };
    }

    public static EvaluatedExprValue DefaultEvaluate(
        this EvalEnvironment environment,
        EvalExpr expr
    )
    {
        return expr switch
        {
            ArrayExpr arrayExpr
                => environment
                    .EvalSelect(arrayExpr.Values, (e, x) => e.Evaluate(x))
                    .Map(x => new ValueExpr(new ArrayValue(x))),
            LetExpr le
                => environment
                    .WithVariables(
                        le.Vars.Select(x => new KeyValuePair<string, EvalExpr>(
                                x.Item1.Name,
                                x.Item2
                            ))
                            .ToList()
                    )
                    .Evaluate(le.In),
            VarExpr ve when environment.GetVariable(ve.Name) is var v
                => v != null
                    ? environment.Evaluate(v)
                    : environment.WithError("No variable $" + ve.Name + " declared").WithNull(),
            ValueExpr v => environment.WithValue(v),
            CallExpr { Function: var func, Args: var args } callExpr
                when environment.GetVariable(func) is ValueExpr { Value: FunctionHandler handler }
                => handler.Evaluate(environment, callExpr),
            CallExpr ce
                => environment.WithError("No function $" + ce.Function + " declared").WithNull(),
            PropertyExpr { Property: var dp }
                => environment.Evaluate(
                    environment.GetData(new FieldPath(dp, environment.BasePath))
                ),
            _ => throw new ArgumentOutOfRangeException(expr.ToString())
        };
    }
}
