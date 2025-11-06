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
                        .Map<EvalExpr>(results =>
                        {
                            // If all results are ValueExpr, create a ValueExpr array
                            if (results.All(r => r is ValueExpr))
                                return new ValueExpr(new ArrayValue(results.Cast<ValueExpr>()));
                            // Otherwise return ArrayExpr
                            return new ArrayExpr(results);
                        }),
                null => leftEval,
                _ => nextEnv.WithError("Can't map " + leftValue.Print()).WithNull()
            };
        }
    );
}
