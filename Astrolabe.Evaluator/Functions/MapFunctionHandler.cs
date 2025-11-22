namespace Astrolabe.Evaluator.Functions;

public static class MapFunctionHandler
{
    public static readonly FunctionHandler Instance = FunctionHandler.BinFunctionHandler(
        "map",
        (e, left, right) =>
        {
            var (nextEnv, leftPartial) = e.EvaluatePartial(left);

            if (leftPartial is not ValueExpr leftValue)
            {
                // Left side is symbolic - return symbolic map call
                return nextEnv.WithValue<EvalExpr>(new CallExpr("map", [leftPartial, right]));
            }

            return leftValue.Value switch
            {
                ArrayValue av => MapArray(nextEnv, av, leftValue, right),
                null => nextEnv.WithValue<EvalExpr>(leftValue),
                _ => nextEnv.WithError("Can't map " + leftValue.Print())
                    .WithValue<EvalExpr>(ValueExpr.Null)
            };

            EnvironmentValue<EvalExpr> MapArray(
                EvalEnvironment env,
                ArrayValue av,
                ValueExpr arrayValue,
                EvalExpr mapExpr
            )
            {
                var (envAfter, partialResults) = env.EvalSelect(
                    av.Values.Select((x, i) => (x, i)),
                    (e2, v) =>
                    {
                        var (evalEnv, toEval) = mapExpr switch
                        {
                            LambdaExpr { Variable: var name, Value: var valExpr }
                                => e2.WithVariables([new KeyValuePair<string, EvalExpr>(name, v.x)])
                                    .WithValue(valExpr),
                            _ => e2.WithValue(mapExpr)
                        };
                        return evalEnv.WithCurrent(v.x).EvaluatePartial(toEval);
                    }
                );

                var allFullyEvaluated = partialResults.All(r => r is ValueExpr);

                if (allFullyEvaluated)
                {
                    return envAfter.WithValue<EvalExpr>(
                        new ValueExpr(new ArrayValue(partialResults.Cast<ValueExpr>()))
                    );
                }

                // Some results are symbolic - return array expression
                return envAfter.WithValue<EvalExpr>(new ArrayExpr(partialResults));
            }
        }
    );
}
