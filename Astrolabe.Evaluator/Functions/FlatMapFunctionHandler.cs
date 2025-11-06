namespace Astrolabe.Evaluator.Functions;

public static class FlatMapFunctionHandler
{
    public static readonly FunctionHandler Instance = FunctionHandler.BinFunctionHandler(
        ".",
        (e, left, right) =>
        {
            var (nextEnv, leftResult) = e.EvaluateExpr(left);

            // If left is not fully evaluated, return partial CallExpr
            if (leftResult is not ValueExpr leftValue)
                return nextEnv.WithValue<EvalExpr>(new CallExpr(".", [leftResult, right]));

            return leftValue.Value switch
            {
                ArrayValue av
                    => nextEnv
                        .EvalSelect(
                            av.Values.Select((x, i) => (x, i)),
                            (e2, v) => e2.EvaluateWith(v.x, v.i, right)
                        )
                        .Map<EvalExpr>(results =>
                        {
                            // If all results are ValueExpr, create a flattened ValueExpr array
                            if (results.All(r => r is ValueExpr))
                            {
                                var valueExprs = results.Cast<ValueExpr>();
                                return new ValueExpr(new ArrayValue(valueExprs.SelectMany(v => v.AllValues())));
                            }
                            // Otherwise, we have partial results - return ArrayExpr with partially evaluated elements
                            // Flatten what we can
                            var flattened = results.SelectMany(AllValuesExpr).ToList();
                            if (flattened.All(r => r is ValueExpr))
                                return new ValueExpr(new ArrayValue(flattened.Cast<ValueExpr>()));
                            return new ArrayExpr(flattened);
                        }),
                ObjectValue => nextEnv.EvaluateWith(leftValue, null, right).Map<EvalExpr>(x => x),
                null => nextEnv.WithValue<EvalExpr>(leftValue),
                _ => nextEnv.WithError("Can't map " + leftValue.Print()).WithNull()
            };
        }
    );

    private static IEnumerable<EvalExpr> AllValuesExpr(EvalExpr expr)
    {
        return expr switch
        {
            ValueExpr { Value: ArrayValue av } => av.Values,
            ValueExpr { Value: null } => [],
            _ => [expr]
        };
    }
}
