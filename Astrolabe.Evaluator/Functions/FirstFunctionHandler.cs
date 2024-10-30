namespace Astrolabe.Evaluator.Functions;

public delegate ValueExpr? FirstCallback(
    int index,
    List<ValueExpr> array,
    ValueExpr result,
    EvalEnvironment env
);

public class FirstFunctionHandler
{
    public static FunctionHandler Create(
        string name,
        FirstCallback callback,
        ValueExpr? finished = null
    )
    {
        return FunctionHandler.BinFunctionHandler(
            name,
            (env, left, right) =>
            {
                var (leftEnv, leftVal) = env.Evaluate(left);
                return leftVal.Value switch
                {
                    ArrayValue av => RunFirst(av.Values.ToList()),
                    _
                        => leftEnv
                            .WithError($"${name} only works on arrays: {leftVal.Print()}")
                            .WithNull()
                };

                EnvironmentValue<ValueExpr> RunFirst(List<ValueExpr> values)
                {
                    var curEnv = leftEnv;
                    for (var i = 0; i < values.Count; i++)
                    {
                        var (nextEnv, result) = curEnv.EvaluateWith(values[i], i, right);
                        curEnv = nextEnv;
                        var valueResult = callback(i, values, result, curEnv);
                        if (valueResult != null)
                            return curEnv.WithValue(valueResult);
                    }
                    return curEnv.WithValue(finished ?? ValueExpr.Null);
                }
            }
        );
    }
}
