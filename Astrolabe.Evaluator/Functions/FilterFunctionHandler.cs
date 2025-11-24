namespace Astrolabe.Evaluator.Functions;

public static class FilterFunctionHandler
{
    public static readonly FunctionHandler Instance =
        new((e, call) =>
            {
                return call.Args switch
                {
                    [var left, var right] => HandleFilter(e, left, right, call),
                    _ => e.WithError("Filter expects 2 arguments").WithValue<EvalExpr>(ValueExpr.Null)
                };

                EnvironmentValue<EvalExpr> HandleFilter(
                    EvalEnvironment env,
                    EvalExpr left,
                    EvalExpr right,
                    CallExpr originalCall
                )
                {
                    var (nextEnv, leftPartial) = env.EvaluateExpr(left);

                    if (leftPartial is not ValueExpr leftValue)
                    {
                        // Left side is symbolic - return symbolic filter call
                        return nextEnv.WithValue<EvalExpr>(
                            new CallExpr("[", [leftPartial, right])
                        );
                    }

                    return leftValue.Value switch
                    {
                        ArrayValue av
                            when av.Values.Select((x, i) => (x, i)).ToList() is var indexed
                            => FilterArray(nextEnv, leftValue, indexed, right),
                        null => nextEnv.WithValue<EvalExpr>(leftValue),
                        ObjectValue _ => FilterObject(nextEnv, leftValue, right),
                        _ => nextEnv.WithError("Can't filter: " + leftValue.Print())
                            .WithValue<EvalExpr>(ValueExpr.Null)
                    };
                }

                EnvironmentValue<EvalExpr> FilterObject(
                    EvalEnvironment nextEnv,
                    ValueExpr leftValue,
                    EvalExpr right
                )
                {
                    // Evaluate key expression with the object as current context
                    var (keyEnv, keyResult) = nextEnv.EvaluateWith(leftValue, null, right);

                    // Handle null key - return null with preserved dependencies
                    if (keyResult.Value == null)
                    {
                        var nullDeps = DependencyHelpers.CombineDeps(keyResult, ValueExpr.Null, leftValue);
                        return keyEnv.WithValue<EvalExpr>(new ValueExpr(null, null, nullDeps));
                    }

                    if (!keyResult.IsString())
                        return keyEnv.WithError("Object filter must be string")
                            .WithValue<EvalExpr>(ValueExpr.Null);

                    var (propEnv, propValue) = keyEnv.EvaluateWith(
                        leftValue,
                        null,
                        new PropertyExpr(keyResult.AsString())
                    );

                    // Check if key or object has dependencies
                    var keyHasDeps = (keyResult.Deps != null && keyResult.Deps.Any()) || keyResult.Path != null;
                    var objectHasDeps = leftValue.Deps != null && leftValue.Deps.Any();

                    // If neither key nor object has deps, return property value as-is
                    if (!keyHasDeps && !objectHasDeps)
                        return propEnv.WithValue<EvalExpr>(propValue);

                    // Key is dynamic OR object has deps
                    // Add parent reference - if propValue is array, children get deps when extracted via AllValues
                    var parentWithDeps = new ValueExpr(
                        null,
                        propValue.Path,
                        new[] { keyResult }.Concat(leftValue.Deps ?? Enumerable.Empty<ValueExpr>())
                    );
                    return propEnv.WithValue<EvalExpr>(
                        propValue with { Deps = (propValue.Deps ?? Enumerable.Empty<ValueExpr>()).Concat([parentWithDeps]) }
                    );
                }

                EnvironmentValue<EvalExpr> FilterArray(
                    EvalEnvironment nextEnv,
                    ValueExpr arrayValue,
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

                    // Handle null index - return null with preserved dependencies
                    if (firstFilter.Value.Value == null)
                    {
                        var nullDeps = DependencyHelpers.CombineDeps(firstFilter.Value, ValueExpr.Null, arrayValue);
                        return firstFilter.Env.WithValue<EvalExpr>(new ValueExpr(null, null, nullDeps));
                    }

                    if (firstFilter.Value.MaybeDouble() is not { } indLong)
                    {
                        var initialList = firstFilter.Map<IEnumerable<ValueExpr>>(x =>
                            x.IsTrue() ? [indexed[0].Item1] : []
                        );
                        return indexed
                            .Skip(1)
                            .Aggregate(
                                initialList,
                                (acc, v) =>
                                    acc.Env.EvaluateWith(v.Item1, v.Item2, right)
                                        .Map(result => result.IsTrue() ? acc.Value.Append(v.Item1) : acc.Value)
                            )
                            .Map<EvalExpr>(x => new ValueExpr(new ArrayValue(x)));
                    }

                    var ind = (int)indLong;
                    return firstFilter.Map<EvalExpr>(indexResult =>
                    {
                        if (ind >= indexed.Count)
                            return ValueExpr.Null;
                        var element = indexed[ind].Item1;

                        // Check if index or array has dependencies
                        var indexHasDeps = (indexResult.Deps != null && indexResult.Deps.Any()) || indexResult.Path != null;
                        var arrayHasDeps = arrayValue.Deps != null && arrayValue.Deps.Any();

                        // If neither index nor array has deps, return element as-is
                        if (!indexHasDeps && !arrayHasDeps)
                            return element;

                        // Index is dynamic OR array has deps
                        // Add parent reference - if element is array, children get deps when extracted via AllValues
                        var parentWithDeps = new ValueExpr(
                            null,
                            element.Path,
                            new[] { indexResult }.Concat(arrayValue.Deps ?? Enumerable.Empty<ValueExpr>())
                        );
                        return element with { Deps = (element.Deps ?? Enumerable.Empty<ValueExpr>()).Concat([parentWithDeps]) };
                    });
                }
            }
        );
}