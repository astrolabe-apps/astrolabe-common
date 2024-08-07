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
                    .Evaluate(valExpr),
            _ when baseValue.Path is { } bp => environment.WithBasePath(bp).Evaluate(expr),
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
            // ArrayExpr arrayExpr => EvalArray(arrayExpr),
            VarExpr ve when environment.GetVariable(ve.Name) is { } v => environment.Evaluate(v),
            ValueExpr v => environment.WithValue(v),
            CallExpr { Function: var func, Args: var args } callExpr
                when environment.GetVariable(func) is ValueExpr { Value: FunctionHandler handler }
                => handler.Evaluate(environment, callExpr),
            PropertyExpr { Property: var dp }
                => environment.Evaluate(
                    environment.GetData(new FieldPath(dp, environment.BasePath))
                ),
            _ => throw new ArgumentOutOfRangeException(expr.ToString())
        };
    }
}
