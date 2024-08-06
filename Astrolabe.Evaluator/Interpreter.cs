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
        // if (!value.path) throw new Error("No path for element, must use lambda");
        // return evaluate(env.withBasePath(value.path), expr);
        //
        return expr switch
        {
            _ when baseValue.Path is { } bp => environment.WithBasePath(bp).Evaluate(expr),
            _ => throw new ArgumentException("Need a path")
        };
    }

    public static EvaluatedExprValue Evaluate(this EvalEnvironment environment, EvalExpr expr)
    {
        return expr switch
        {
            // ArrayExpr arrayExpr => EvalArray(arrayExpr),
            ValueExpr v => environment.WithValue(v),
            CallExpr { Function: var func, Args: var args } callExpr
                when environment.GetVariable(func) is ValueExpr { Value: FunctionHandler handler }
                => handler.Evaluate(environment, callExpr),
            PropertyExpr { Property: var dp }
                => environment.WithValue(
                    environment.GetData(new FieldPath(dp, environment.BasePath))
                ),
            _ => throw new ArgumentOutOfRangeException(expr.ToString())
        };
    }
}
