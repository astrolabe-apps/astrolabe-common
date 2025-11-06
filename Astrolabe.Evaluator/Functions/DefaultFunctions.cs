using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator.Functions;

public static class DefaultFunctions
{
    public static ValueExpr ExprValuesToString(
        IEnumerable<ValueExpr> values,
        Func<string, string> after
    )
    {
        var allVals = values.Select(ExprValueToString).ToList();
        return ValueExpr.WithDeps(after(string.Join("", allVals.Select(x => x.Value))), allVals);
    }

    public static ValueExpr ExprValueToString(ValueExpr value)
    {
        return value.Value switch
        {
            ArrayValue av => ExprValuesToString(av.Values, x => x),
            var o => value with
            {
                Value = o switch
                {
                    null => "null",
                    bool b => b ? "true" : "false",
                    _ => o.ToString(),
                },
            },
        };
    }

    public static FunctionHandler UnaryNullOp(Func<object, object?> evaluate)
    {
        return new FunctionHandler((env, call) =>
        {
            if (call.Args.Count != 1)
                return env.WithError("Wrong number of args").WithNull();

            var (env1, arg) = env.EvaluateExpr(call.Args[0]);

            // If arg is ValueExpr with null, return null immediately
            if (arg is ValueExpr v && v.Value == null)
                return env1.WithValue(ValueExpr.WithDeps(null, [v]));

            // Check if arg is fully evaluated ValueExpr
            if (arg is not ValueExpr val)
                return env1.WithValue(new CallExpr(call.Function, new[] { arg }));

            // Perform operation
            return env1.WithValue(ValueExpr.WithDeps(evaluate(val.Value!), [val]));
        });
    }

    public static FunctionHandler BinOp(Func<object?, object?, object?> evaluate)
    {
        return new FunctionHandler((env, call) =>
        {
            if (call.Args.Count != 2)
                return env.WithError("Wrong number of args").WithNull();

            var (env1, arg1) = env.EvaluateExpr(call.Args[0]);
            var (env2, arg2) = env1.EvaluateExpr(call.Args[1]);

            // Check if both are ValueExpr
            if (arg1 is not ValueExpr val1 || arg2 is not ValueExpr val2)
                return env2.WithValue(new CallExpr(call.Function, new[] { arg1, arg2 }));

            // Perform operation
            return env2.WithValue(ValueExpr.WithDeps(evaluate(val1.Value, val2.Value), [val1, val2]));
        });
    }

    public static FunctionHandler BinNullOp(Func<EvalEnvironment, object, object, object?> evaluate)
    {
        return new FunctionHandler((env, call) =>
        {
            if (call.Args.Count != 2)
                return env.WithError("Wrong number of args").WithNull();

            // Use EvaluateExpr to support partial evaluation
            var (env1, arg1) = env.EvaluateExpr(call.Args[0]);
            var (env2, arg2) = env1.EvaluateExpr(call.Args[1]);

            // If either arg is ValueExpr with null, can return null immediately
            if (arg1 is ValueExpr v1 && v1.Value == null)
                return env2.WithValue(ValueExpr.WithDeps(null, [v1, arg2 is ValueExpr v2 ? v2 : ValueExpr.Null]));
            if (arg2 is ValueExpr v2b && v2b.Value == null)
                return env2.WithValue(ValueExpr.WithDeps(null, [arg1 is ValueExpr v1b ? v1b : ValueExpr.Null, v2b]));

            // Check if both are ValueExpr with non-null values
            if (arg1 is not ValueExpr val1 || arg2 is not ValueExpr val2)
                return env2.WithValue(new CallExpr(call.Function, new[] { arg1, arg2 })); // Return CallExpr with partially evaluated args

            // Both are non-null ValueExpr, perform operation
            return env2.WithValue(ValueExpr.WithDeps(evaluate(env2, val1.Value!, val2.Value!), [val1, val2]));
        });
    }

    public static FunctionHandler BoolOp(Func<bool, bool, bool> func)
    {
        return BinNullOp(
            (e, a, b) =>
                (a, b) switch
                {
                    (bool b1, bool b2) => func(b1, b2),
                    _ => throw new ArgumentException("Bad args for bool op"),
                }
        );
    }

    public static FunctionHandler NumberOp<TOutD, TOutL>(
        Func<double, double, TOutD> doubleOp,
        Func<long, long, TOutL> longOp
    )
    {
        return BinNullOp(
            (e, o1, o2) =>
            {
                if (ValueExpr.MaybeInteger(o1) is { } l1 && ValueExpr.MaybeInteger(o2) is { } l2)
                {
                    return longOp(l1, l2);
                }
                return doubleOp(ValueExpr.AsDouble(o1), ValueExpr.AsDouble(o2));
            }
        );
    }

    public static FunctionHandler ComparisonFunc(Func<int, bool> toResult)
    {
        return BinNullOp((e, v1, v2) => toResult(e.Compare(v1, v2)));
    }

    private static readonly FunctionHandler IfElseOp = new FunctionHandler(
        (env, call) =>
        {
            if (call.Args.Count != 3)
            {
                return env.WithError("Conditional expects 3 arguments").WithNull();
            }
            var (env1, condResult) = env.EvaluateExpr(call.Args[0]);

            // If condition is not fully evaluated, return partial CallExpr
            if (condResult is not ValueExpr condVal)
                return env1.WithValue<EvalExpr>(new CallExpr("?", [condResult, call.Args[1], call.Args[2]]));

            return condVal.Value switch
            {
                true => env1.EvaluateExpr(call.Args[1])
                    .Map<EvalExpr>(thenVal => ValueExpr.WithDeps(thenVal is ValueExpr tv ? tv.Value : null, [condVal, thenVal as ValueExpr ?? condVal])),
                false => env1.EvaluateExpr(call.Args[2])
                    .Map<EvalExpr>(elseVal => ValueExpr.WithDeps(elseVal is ValueExpr ev ? ev.Value : null, [condVal, elseVal as ValueExpr ?? condVal])),
                null => env1.WithValue<EvalExpr>(ValueExpr.WithDeps(null, [condVal])),
                _ => env1.WithError("Conditional expects boolean condition").WithNull(),
            };
        }
    );

    private static FunctionHandler StringOp(Func<string, string> after)
    {
        return new FunctionHandler((env, call) =>
        {
            var (nextEnv, evalArgs) = env.EvalSelect(call.Args, (e, x) => e.EvaluateExpr(x));

            // Check if all args are ValueExpr
            if (evalArgs.Any(arg => arg is not ValueExpr))
                return nextEnv.WithValue(new CallExpr(call.Function, evalArgs.ToList()));

            var args = evalArgs.Cast<ValueExpr>().ToList();
            return nextEnv.WithValue(ExprValuesToString(args, after));
        });
    }

    public static FunctionHandler ArrayOp(Func<List<ValueExpr>, ValueExpr?, ValueExpr> arrayFunc)
    {
        return new FunctionHandler((env, call) =>
        {
            var (nextEnv, evalArgs) = env.EvalSelect(call.Args, (e, x) => e.EvaluateExpr(x));

            // Check if all args are ValueExpr
            if (evalArgs.Any(arg => arg is not ValueExpr))
                return nextEnv.WithValue(new CallExpr(call.Function, evalArgs.ToList()));

            var args = evalArgs.Cast<ValueExpr>().ToList();
            var result = args switch
            {
                [{ Value: ArrayValue av } singleArg] => arrayFunc(av.Values.ToList(), singleArg),
                _ => arrayFunc(args, null),
            };
            return nextEnv.WithValue(result);
        });
    }

    public static FunctionHandler ArrayAggOp<T>(T init, Func<T, object?, T> arrayFunc)
    {
        return ArrayOp(
            (args, _) =>
                ValueExpr.WithDeps(
                    args.All(x => x.Value != null)
                        ? args.Aggregate(init, (acc, next) => arrayFunc(acc, next.Value))
                        : null,
                    args
                )
        );
    }

    /// <summary>
    /// Helper for short-circuiting boolean operators (AND/OR).
    /// Evaluates arguments sequentially until short-circuit condition is met.
    /// </summary>
    /// <param name="env">The evaluation environment</param>
    /// <param name="call">The function call expression</param>
    /// <param name="shortCircuitValue">The value that triggers short-circuiting (false for AND, true for OR)</param>
    /// <param name="defaultResult">The result when all args evaluated without short-circuit (true for AND, false for OR)</param>
    private static EnvironmentValue<ValueExpr> ShortCircuitBooleanOp(
        EvalEnvironment env,
        CallExpr call,
        bool shortCircuitValue,
        bool defaultResult
    )
    {
        var deps = new List<ValueExpr>();
        var currentEnv = env;

        foreach (var arg in call.Args)
        {
            var (nextEnv, argResult) = currentEnv.Evaluate(arg);
            currentEnv = nextEnv;
            deps.Add(argResult);

            // Short-circuit: if we hit the short-circuit value, stop evaluating
            if (argResult.Value is bool b && b == shortCircuitValue)
            {
                return currentEnv.WithValue(ValueExpr.WithDeps(shortCircuitValue, deps));
            }

            // If null, return null
            if (argResult.Value is null)
            {
                return currentEnv.WithValue(ValueExpr.WithDeps(null, deps));
            }

            // If not a valid boolean, return null
            if (argResult.Value is not bool || (bool)argResult.Value != !shortCircuitValue)
            {
                return currentEnv.WithValue(ValueExpr.WithDeps(null, deps));
            }
        }

        // All arguments evaluated without short-circuiting
        return currentEnv.WithValue(ValueExpr.WithDeps(defaultResult, deps));
    }

    private static readonly FunctionHandler ElemFunctionHandler = new FunctionHandler(
        (env, call) =>
        {
            if (call.Args.Count != 2)
            {
                return env.WithError("elem expects 2 arguments").WithNull();
            }
            var (env1, arrayVal) = env.Evaluate(call.Args[0]);
            var (env2, indexVal) = env1.Evaluate(call.Args[1]);

            return (arrayVal.Value, indexVal.Value) switch
            {
                (ArrayValue av, var indO)
                    when ValueExpr.MaybeIndex(indO) is { } ind
                        && av.Values.ToList() is var vl
                        && vl.Count > ind =>
                // Check if index or array has dependencies
                (
                    (indexVal.Deps == null || !indexVal.Deps.Any()) && indexVal.Path == null
                )
                    ? (arrayVal.Deps == null || !arrayVal.Deps.Any())
                        ? env2.WithValue(vl[ind]) // Neither index nor array has deps
                        : env2.WithValue(
                            vl[ind] with
                            {
                                Deps = DependencyHelpers.CombineDeps(indexVal, vl[ind], arrayVal),
                            }
                        )
                    : env2.WithValue(
                        vl[ind] with
                        {
                            Deps = DependencyHelpers.CombineDeps(indexVal, vl[ind], arrayVal),
                        }
                    ),
                _ => env2.WithValue(ValueExpr.WithDeps(null, [arrayVal, indexVal])),
            };
        }
    );

    private static FunctionHandler KeysOrValuesFunctionHandler(string type) =>
        new FunctionHandler(
            (e, c) =>
            {
                if (c.Args.Count != 1)
                {
                    return e.WithError($"{type} expects 1 argument").WithNull();
                }

                var (nextEnv, objVal) = e.Evaluate(c.Args[0]);

                return objVal.Value switch
                {
                    ObjectValue ov => nextEnv.WithValue(
                        new ValueExpr(
                            new ArrayValue(
                                ov.Properties.Select(x =>
                                        type == "keys" ? new ValueExpr(x.Key) : x.Value
                                    )
                                    .ToList()
                            ),
                            objVal.Path,
                            objVal.Deps
                        )
                    ),
                    _ => nextEnv
                        .WithError($"{type} expects an object: " + objVal.Print())
                        .WithNull(),
                };
            }
        );

    private static JsonNode? ToJsonNode(object? objValue)
    {
        return objValue switch
        {
            ObjectValue ov => new JsonObject(
                ov.Properties.Select(kvp => new KeyValuePair<string, JsonNode?>(
                    kvp.Key,
                    ToJsonNode(kvp.Value.Value)
                ))
            ),
            ArrayValue av => new JsonArray(av.Values.Select(x => ToJsonNode(x.Value)).ToArray()),
            _ => JsonValue.Create(objValue),
        };
    }

    public static EvalEnvironment AddDefaultFunctions(this EvalEnvironment eval)
    {
        return eval.WithVariables(
            FunctionHandlers
                .Select(x => new KeyValuePair<string, EvalExpr>(x.Key, new ValueExpr(x.Value)))
                .ToList()
        );
    }

    public static EnvironmentValue<ValueExpr> WhichFunction(EvalEnvironment env, CallExpr call)
    {
        return call.Args.ToList() switch
        {
            [var cond, .. var others] when env.Evaluate(cond) is var (nextEnv, condValue) =>
                FindWhich(nextEnv, condValue, others),
        };

        EnvironmentValue<ValueExpr> FindWhich(
            EvalEnvironment curEnv,
            ValueExpr condValue,
            List<EvalExpr> others
        )
        {
            if (condValue.IsNull())
                return curEnv.WithNull();
            var condCompare = condValue.Value;
            var i = 0;
            while (i < others.Count - 1)
            {
                var compare = others[i++];
                var value = others[i++];
                var (nextEnv, compValue) = curEnv.Evaluate(compare);

                if (
                    compValue
                        .ToArray()
                        .Values.Any(x => curEnv.Compare(x.Value, condValue.Value) == 0)
                )
                {
                    return nextEnv
                        .Evaluate(value)
                        .Map(x => ValueExpr.WithDeps(x.Value, [condValue, compValue, x]));
                }
                curEnv = nextEnv;
            }
            return curEnv.WithValue(ValueExpr.WithDeps(null, [condValue]));
        }
    }

    public static readonly Dictionary<string, FunctionHandler> FunctionHandlers = new()
    {
        { "+", NumberOp((d1, d2) => d1 + d2, (l1, l2) => l1 + l2) },
        { "-", NumberOp((d1, d2) => d1 - d2, (l1, l2) => l1 - l2) },
        { "*", NumberOp((d1, d2) => d1 * d2, (l1, l2) => l1 * l2) },
        { "/", NumberOp((d1, d2) => d1 / d2, (l1, l2) => (double)l1 / l2) },
        { "%", NumberOp((d1, d2) => d1 % d2, (l1, l2) => (double)l1 % l2) },
        { "=", ComparisonFunc(v => v == 0) },
        { "!=", ComparisonFunc(v => v != 0) },
        { "<", ComparisonFunc(x => x < 0) },
        { "<=", ComparisonFunc(x => x <= 0) },
        { ">", ComparisonFunc(x => x > 0) },
        { ">=", ComparisonFunc(x => x >= 0) },
        // Short-circuiting AND operator - stops on false, returns true if all true
        {
            "and",
            new FunctionHandler(
                (env, call) =>
                    ShortCircuitBooleanOp(env, call, shortCircuitValue: false, defaultResult: true)
            )
        },
        // Short-circuiting OR operator - stops on true, returns false if all false
        {
            "or",
            new FunctionHandler(
                (env, call) =>
                    ShortCircuitBooleanOp(env, call, shortCircuitValue: true, defaultResult: false)
            )
        },
        { "!", UnaryNullOp(a => a is bool b ? !b : null) },
        { "?", IfElseOp },
        {
            "??",
            new FunctionHandler((env, call) =>
            {
                if (call.Args.Count != 2)
                    return env.WithError("?? expects 2 arguments").WithNull();

                var (env1, arg1) = env.EvaluateExpr(call.Args[0]);
                var (env2, arg2) = env1.EvaluateExpr(call.Args[1]);

                // If either arg is not ValueExpr, return partial expression
                if (arg1 is not ValueExpr v1 || arg2 is not ValueExpr v2)
                    return env2.WithValue(new CallExpr("??", new[] { arg1, arg2 }));

                // If first value is not null, return it
                if (!v1.IsNull())
                    return env2.WithValue(v1);

                // Return second value with dependencies
                return env2.WithValue(new ValueExpr(v2.Value, v2.Path, new[] { v1, v2 }));
            })
        },
        { "sum", ArrayAggOp(0d, (acc, v) => acc + ValueExpr.AsDouble(v)) },
        {
            "min",
            ArrayAggOp(
                (double?)null,
                (acc, v) => Math.Min(acc ?? double.MaxValue, ValueExpr.AsDouble(v))
            )
        },
        {
            "max",
            ArrayAggOp(
                (double?)null,
                (acc, v) => Math.Max(acc ?? double.MinValue, ValueExpr.AsDouble(v))
            )
        },
        { "count", ArrayOp((args, o) => ValueExpr.WithDeps(args.Count, o != null ? [o] : [])) },
        {
            "array",
            new FunctionHandler((env, call) =>
            {
                var (nextEnv, evalArgs) = env.EvalSelect(call.Args, (e, x) => e.EvaluateExpr(x));

                // Check if all args are ValueExpr
                if (evalArgs.Any(arg => arg is not ValueExpr))
                    return nextEnv.WithValue(new CallExpr("array", evalArgs.ToList()));

                var args = evalArgs.Cast<ValueExpr>().ToList();
                return nextEnv.WithValue(new ValueExpr(new ArrayValue(
                    args.SelectMany(x => x.AllValues())
                )));
            })
        },
        {
            "notEmpty",
            new FunctionHandler((env, call) =>
            {
                if (call.Args.Count != 1)
                    return env.WithError("notEmpty expects 1 argument").WithNull();

                var (env1, arg) = env.EvaluateExpr(call.Args[0]);

                if (arg is not ValueExpr v)
                    return env1.WithValue(new CallExpr("notEmpty", new[] { arg }));

                var result = v.Value switch
                {
                    string s => !string.IsNullOrWhiteSpace(s),
                    null => false,
                    _ => true,
                };
                return env1.WithValue(ValueExpr.WithDeps(result, [v]));
            })
        },
        { "string", StringOp(x => x) },
        { "lower", StringOp(x => x.ToLower()) },
        { "upper", StringOp(x => x.ToUpper()) },
        { "which", new FunctionHandler(WhichFunction) },
        { "elem", ElemFunctionHandler },
        {
            "first",
            FirstFunctionHandler.Create(
                "first",
                (i, values, res, _) => res.IsTrue() ? values[i] : null
            )
        },
        {
            "firstIndex",
            FirstFunctionHandler.Create(
                "firstIndex",
                (i, values, res, _) => res.IsTrue() ? ValueExpr.From(i) : null
            )
        },
        {
            "any",
            FirstFunctionHandler.Create(
                "any",
                (_, __, r, _) => r.IsTrue() ? ValueExpr.True : null,
                ValueExpr.False
            )
        },
        {
            "all",
            FirstFunctionHandler.Create(
                "all",
                (_, __, r, _) => !r.IsTrue() ? ValueExpr.False : null,
                ValueExpr.True
            )
        },
        {
            "contains",
            FirstFunctionHandler.Create(
                "contains",
                (i, v, r, env) => env.Compare(v[i].Value, r.Value) == 0 ? ValueExpr.True : null,
                ValueExpr.False
            )
        },
        {
            "indexOf",
            FirstFunctionHandler.Create(
                "indexOf",
                (i, v, r, env) => env.Compare(v[i].Value, r.Value) == 0 ? ValueExpr.From(i) : null
            )
        },
        { "[", FilterFunctionHandler.Instance },
        { "map", MapFunctionHandler.Instance },
        { ".", FlatMapFunctionHandler.Instance },
        {
            "fixed",
            new FunctionHandler((env, call) =>
            {
                if (call.Args.Count != 2)
                    return env.WithError("fixed expects 2 arguments").WithNull();

                var (env1, arg1) = env.EvaluateExpr(call.Args[0]);
                var (env2, arg2) = env1.EvaluateExpr(call.Args[1]);

                if (arg1 is not ValueExpr v1 || arg2 is not ValueExpr v2)
                    return env2.WithValue(new CallExpr("fixed", new[] { arg1, arg2 }));

                var result = (v1.Value, v2.Value) switch
                {
                    var (numV, digitsV)
                        when ValueExpr.MaybeDouble(numV) is { } num
                            && ValueExpr.MaybeDouble(digitsV) is { } digits => num.ToString("F" + (int)digits),
                    _ => null,
                };
                return env2.WithValue(ValueExpr.WithDeps(result, [v1, v2]));
            })
        },
        {
            "object",
            new FunctionHandler((env, call) =>
            {
                var (nextEnv, evalArgs) = env.EvalSelect(call.Args, (e, x) => e.EvaluateExpr(x));

                // Check if all args are ValueExpr
                if (evalArgs.Any(arg => arg is not ValueExpr))
                    return nextEnv.WithValue(new CallExpr("object", evalArgs.ToList()));

                var args = evalArgs.Cast<ValueExpr>().ToList();
                var i = 0;
                var obj = new Dictionary<string, ValueExpr>();
                while (i < args.Count - 1)
                {
                    var name = (string)args[i++].Value!;
                    var value = args[i++];
                    obj[name] = value;
                }
                return nextEnv.WithValue(new ValueExpr(new ObjectValue(obj)));
            })
        },
        { "this", new FunctionHandler((e, c) => e.WithValue(e.Current)) },
        { "keys", KeysOrValuesFunctionHandler("keys") },
        { "values", KeysOrValuesFunctionHandler("values") },
        {
            "merge",
            new FunctionHandler(
                (env, call) =>
                {
                    if (call.Args.Count == 0)
                    {
                        return env.WithError("merge expects at least 1 argument").WithNull();
                    }

                    var merged = new Dictionary<string, ValueExpr>();
                    var currentEnv = env;

                    foreach (var arg in call.Args)
                    {
                        var (nextEnv, argVal) = currentEnv.Evaluate(arg);
                        currentEnv = nextEnv;

                        if (argVal.IsNull())
                        {
                            return currentEnv.WithNull();
                        }

                        if (argVal.Value is ObjectValue ov)
                        {
                            foreach (var kvp in ov.Properties)
                            {
                                merged[kvp.Key] = kvp.Value;
                            }
                        }
                    }

                    return currentEnv.WithValue(new ValueExpr(new ObjectValue(merged)));
                }
            )
        },
    };
}
