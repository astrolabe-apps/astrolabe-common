namespace Astrolabe.Evaluator.Functions;

public static class FilterFunctionHandler
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
                                when av.Values.Select((x, i) => (x, i)).ToList() is var indexed
                                => nextEnv
                                    .EvalSelect(
                                        indexed,
                                        (e2, v) => e2.EvaluateElem(v.x, v.i, right)
                                    )
                                    .Map(x =>
                                    {
                                        var filters = x.Select(v => v.Value).ToList();
                                        return new ValueExpr(
                                            new ArrayValue(
                                                av.Values.Where(
                                                    (_, i) =>
                                                        filters[i] switch
                                                        {
                                                            bool b => b,
                                                            double d => (int)d == i,
                                                            int iv => iv == i,
                                                            _ => false
                                                        }
                                                )
                                            )
                                        );
                                    })
                        }
                };
                throw new NotImplementedException();
                //
                // const [left, right] = call.args;
                // const [leftEnv, { value, path }] = evaluate(env, left);
                // if (Array.isArray(value)) {
                //     const accArray: ValueExpr[] = [];
                //     const outEnv = value.reduce(
                //         (e, x: ValueExpr, ind) =>
                //     envEffect(evaluateElem(e, x, ind, right), ({ value }) => {
                //         if ((typeof value === "number" && ind === value) || value === true)
                //         accArray.push(x);
                //     }),
                //     leftEnv,
                //         );
                //     return [outEnv, valueExpr(accArray)];
                // }
            }
        );
}
