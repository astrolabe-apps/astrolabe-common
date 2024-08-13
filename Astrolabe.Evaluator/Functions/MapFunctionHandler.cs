namespace Astrolabe.Evaluator.Functions;

public static class MapFunctionHandler
{
    public static readonly FunctionHandler Instance =
        new(
            (e, call) =>
            {
                return call.Args switch
                {
                    [var left, var right]
                        when e.Evaluate(left) is (var nextEnv, var leftValue) leftEval
                        => leftValue.Value switch
                        {
                            ArrayValue av
                                => nextEnv
                                    .EvalSelect(
                                        av.Values.Select((x, i) => (x, i)),
                                        (e2, v) => e2.EvaluateWith(v.x, v.i, right)
                                    )
                                    .Map(x => new ValueExpr(
                                        new ArrayValue(x.SelectMany(v => v.AllValues()))
                                    )),
                            ObjectValue => nextEnv.EvaluateWith(leftValue, null, right),
                            null => leftEval,
                            _ => nextEnv.WithError("Can't map " + leftValue.Print()).WithNull()
                        }
                };
            }
        );
}
