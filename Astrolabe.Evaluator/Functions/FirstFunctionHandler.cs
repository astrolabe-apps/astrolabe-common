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
                var (leftEnv, leftPartial) = env.EvaluatePartial(left);

                if (leftPartial is not ValueExpr leftVal)
                {
                    // Left side is symbolic - return symbolic call
                    return leftEnv.WithValue<EvalExpr>(new CallExpr(name, [leftPartial, right]));
                }

                return leftVal.Value switch
                {
                    ArrayValue av => RunFirst(av.Values.ToList()),
                    _
                        => leftEnv
                            .WithError($"${name} only works on arrays: {leftVal.Print()}")
                            .WithValue<EvalExpr>(ValueExpr.Null)
                };

                EnvironmentValue<EvalExpr> RunFirst(List<ValueExpr> values)
                {
                    var curEnv = leftEnv;
                    for (var i = 0; i < values.Count; i++)
                    {
                        var (nextEnv, result) = curEnv.EvaluateWith(values[i], i, right);
                        curEnv = nextEnv;
                        var valueResult = callback(i, values, result, curEnv);
                        if (valueResult != null)
                            return curEnv.WithValue<EvalExpr>(valueResult);
                    }
                    return curEnv.WithValue<EvalExpr>(finished ?? ValueExpr.Null);
                }
            }
        );
    }
}
