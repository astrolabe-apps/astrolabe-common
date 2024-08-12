namespace Astrolabe.Evaluator.Functions;

public static class MapFunctionHandler
{
    public static readonly FunctionHandler Instance =
        new(
            (e, call) =>
            {
                return call.Args switch
                {
                    [var left, var right] when e.Evaluate(left) is var leftVar
                        => leftVar switch
                        {
                            (var nextEnv, { Value: ArrayValue av })
                                => nextEnv
                                    .EvalSelect(
                                        av.Values.Select((x, i) => (x, i)),
                                        (e2, v) => e2.EvaluateElem(v.x, v.i, right)
                                    )
                                    .Map(x => new ValueExpr(
                                        new ArrayValue(x.SelectMany(v => v.AllValues()))
                                    )),
                            (var nextEnv, { Value: ObjectValue })
                                => nextEnv.EvaluateElem(leftVar.Value, null, right)
                        }
                };
            }
        );
}
