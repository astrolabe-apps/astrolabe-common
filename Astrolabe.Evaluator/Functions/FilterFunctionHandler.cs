namespace Astrolabe.Evaluator.Functions;

public static class FilterFunctionHandler
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
                                when av.Values.Select((x, i) => (x, i)).ToList() is var indexed
                                => FilterArray(nextEnv, indexed, right),
                            null => leftEval,
                            ObjectValue _ => FilterObject(nextEnv, leftValue, right),
                            _ => nextEnv.WithError("Can't filter: " + leftValue.Print()).WithNull()
                        }
                };

                EnvironmentValue<ValueExpr> FilterObject(
                    EvalEnvironment nextEnv,
                    ValueExpr leftValue,
                    EvalExpr right
                )
                {
                    var (env, firstFilterValue) = nextEnv.EvaluateWith(leftValue, null, right);
                    if (!firstFilterValue.IsString())
                        return env.WithError("Object filter must be string").WithNull();
                    return env.EvaluateWith(
                        leftValue,
                        null,
                        new PropertyExpr(firstFilterValue.AsString())
                    );
                }

                EnvironmentValue<ValueExpr> FilterArray(
                    EvalEnvironment nextEnv,
                    List<(ValueExpr, int)> indexed,
                    EvalExpr right
                )
                {
                    var empty = indexed.Count == 0;
                    var firstFilter = nextEnv.EvaluateWith(
                        empty ? ValueExpr.Null : indexed[0].Item1,
                        empty ? null : 0,
                        right
                    );
                    if (firstFilter.Value.MaybeDouble() is not { } indLong)
                        return indexed
                            .Skip(1)
                            .Aggregate(
                                firstFilter.Map<IEnumerable<ValueExpr>>(x =>
                                    x.IsTrue() ? [indexed[0].Item1] : []
                                ),
                                (acc, v) =>
                                    acc
                                        .Env.EvaluateWith(v.Item1, v.Item2, right)
                                        .Map(result =>
                                            result.IsTrue() ? acc.Value.Append(v.Item1) : acc.Value
                                        )
                            )
                            .Map(x => new ValueExpr(new ArrayValue(x)));

                    var ind = (int)indLong;
                    return firstFilter.Map(x =>
                        ind < indexed.Count ? indexed[ind].Item1 : ValueExpr.Null
                    );
                }
            }
        );
}
