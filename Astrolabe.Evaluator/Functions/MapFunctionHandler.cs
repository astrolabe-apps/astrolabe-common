namespace Astrolabe.Evaluator.Functions;

public static class MapFunctionHandler
{
    public static readonly FunctionHandler Instance = FunctionHandler.BinFunctionHandler(
        "map",
        (e, left, right) =>
        {
            var leftEval = e.Evaluate(left);
            var (nextEnv, leftValue) = leftEval;
            return leftValue.Value switch
            {
                ArrayValue av
                    => nextEnv
                        .EvalSelect(
                            av.Values.Select((x, i) => (x, i)),
                            (e2, v) => e2.EvaluateWithValue(v.x, v.x, right)
                        )
                        .Map(x => new ValueExpr(new ArrayValue(x))),
                null => leftEval,
                _ => nextEnv.WithError("Can't map " + leftValue.Print()).WithNull()
            };
        }
    );
}
