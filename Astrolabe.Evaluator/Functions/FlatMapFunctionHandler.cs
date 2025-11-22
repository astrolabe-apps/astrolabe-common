namespace Astrolabe.Evaluator.Functions;

public static class FlatMapFunctionHandler
{
    public static readonly FunctionHandler Instance = FunctionHandler.BinFunctionHandler(
        ".",
        (e, left, right) =>
        {
            var (nextEnv, leftPartial) = e.EvaluatePartial(left);

            if (leftPartial is not ValueExpr leftValue)
            {
                // Left side is symbolic - return symbolic flatmap call
                return nextEnv.WithValue<EvalExpr>(new CallExpr(".", [leftPartial, right]));
            }

            return leftValue.Value switch
            {
                ArrayValue av
                    => nextEnv
                        .EvalSelect(
                            av.Values.Select((x, i) => (x, i)),
                            (e2, v) => e2.EvaluateWith(v.x, v.i, right)
                        )
                        .Map<EvalExpr>(x => new ValueExpr(new ArrayValue(x.SelectMany(v => v.AllValues())))),
                ObjectValue => nextEnv.EvaluateWith(leftValue, null, right).Map<EvalExpr>(v => v),
                null => nextEnv.WithValue<EvalExpr>(leftValue),
                _ => nextEnv.WithError("Can't map " + leftValue.Print())
                    .WithValue<EvalExpr>(ValueExpr.Null)
            };
        }
    );
}
