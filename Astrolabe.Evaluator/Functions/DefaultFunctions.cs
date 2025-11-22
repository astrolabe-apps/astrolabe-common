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
        return FunctionHandler.DefaultEval(args =>
            args switch
            {
                [{ } v1] => evaluate(v1),
                [_] => null,
                _ => throw new ArgumentException("Wrong number of args:" + args),
            }
        );
    }

    public static FunctionHandler BinOp(Func<object?, object?, object?> evaluate)
    {
        return FunctionHandler.DefaultEval(args =>
            args switch
            {
                [var v1, var v2] => evaluate(v1, v2),
                _ => throw new ArgumentException("Wrong number of args:" + args),
            }
        );
    }

    public static FunctionHandler BinNullOp(Func<EvalEnvironment, object, object, object?> evaluate)
    {
        return FunctionHandler.DefaultEval(
            (e, args) =>
                args switch
                {
                    [{ } v1, { } v2] => evaluate(e, v1, v2),
                    [_, _] => null,
                    _ => throw new ArgumentException("Wrong number of args:" + args),
                }
        );
    }

    /// <summary>
    /// Binary operator with partial evaluation support
    /// </summary>
    public static FunctionHandler BinPartialOp(
        string name,
        Func<EvalEnvironment, object, object, object?> evaluate
    )
    {
        return FunctionHandler.BinFunctionHandler(
            name,
            (env, a, b) =>
            {
                var (env1, aPartial) = env.EvaluatePartial(a);
                var (env2, bPartial) = env1.EvaluatePartial(b);

                if (aPartial is ValueExpr aVal && bPartial is ValueExpr bVal)
                {
                    // Both fully evaluated
                    if (aVal.Value == null || bVal.Value == null)
                    {
                        return env2.WithValue<EvalExpr>(ValueExpr.WithDeps(null, [aVal, bVal]));
                    }
                    return env2.WithValue<EvalExpr>(
                        ValueExpr.WithDeps(evaluate(env2, aVal.Value, bVal.Value), [aVal, bVal])
                    );
                }

                // Return symbolic call expression
                return env2.WithValue<EvalExpr>(new CallExpr(name, [aPartial, bPartial]));
            }
        );
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

    /// <summary>
    /// Number operator with partial evaluation support
    /// </summary>
    public static FunctionHandler NumberPartialOp<TOutD, TOutL>(
        string name,
        Func<double, double, TOutD> doubleOp,
        Func<long, long, TOutL> longOp
    )
    {
        return BinPartialOp(
            name,
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

    /// <summary>
    /// Comparison function with partial evaluation support
    /// </summary>
    public static FunctionHandler ComparisonPartialFunc(string name, Func<int, bool> toResult)
    {
        return BinPartialOp(name, (e, v1, v2) => toResult(e.Compare(v1, v2)));
    }

    /// <summary>
    /// Conditional operator with partial evaluation support (branch selection)
    /// </summary>
    private static readonly FunctionHandler IfElseOp = new FunctionHandler(
        (env, call) =>
        {
            if (call.Args.Count != 3)
            {
                return env.WithError("Conditional expects 3 arguments")
                    .WithValue<EvalExpr>(ValueExpr.Null);
            }

            var (condExpr, thenExpr, elseExpr) = (call.Args[0], call.Args[1], call.Args[2]);
            var (env1, condPartial) = env.EvaluatePartial(condExpr);

            if (condPartial is ValueExpr condVal)
            {
                // Condition is fully evaluated - select branch
                return condVal.Value switch
                {
                    true =>
                        env1.EvaluatePartial(thenExpr)
                            .Map(thenVal =>
                                thenVal is ValueExpr thenValue
                                    ? (EvalExpr)ValueExpr.WithDeps(thenValue.Value, [condVal, thenValue])
                                    : thenVal
                            ),
                    false =>
                        env1.EvaluatePartial(elseExpr)
                            .Map(elseVal =>
                                elseVal is ValueExpr elseValue
                                    ? (EvalExpr)ValueExpr.WithDeps(elseValue.Value, [condVal, elseValue])
                                    : elseVal
                            ),
                    null => env1.WithValue<EvalExpr>(ValueExpr.WithDeps(null, [condVal])),
                    _ => env1.WithError("Conditional expects boolean condition")
                        .WithValue<EvalExpr>(ValueExpr.Null),
                };
            }

            // Condition is symbolic - partially evaluate both branches
            var (env2, thenPartial) = env1.EvaluatePartial(thenExpr);
            var (env3, elsePartial) = env2.EvaluatePartial(elseExpr);
            return env3.WithValue<EvalExpr>(new CallExpr("?", [condPartial, thenPartial, elsePartial]));
        }
    );

    private static FunctionHandler StringOp(Func<string, string> after)
    {
        return FunctionHandler.DefaultEvalArgs((_, args) => ExprValuesToString(args, after));
    }

    public static FunctionHandler ArrayOp(Func<List<ValueExpr>, ValueExpr?, ValueExpr> arrayFunc)
    {
        return FunctionHandler.DefaultEvalArgs(
            (_, args) =>
                args switch
                {
                    [{ Value: ArrayValue av } singleArg] => arrayFunc(
                        av.Values.ToList(),
                        singleArg
                    ),
                    _ => arrayFunc(args, null),
                }
        );
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
    /// Helper for short-circuiting boolean operators (AND/OR) with partial evaluation.
    /// Evaluates arguments sequentially until short-circuit condition is met.
    /// </summary>
    /// <param name="env">The evaluation environment</param>
    /// <param name="call">The function call expression</param>
    /// <param name="shortCircuitValue">The value that triggers short-circuiting (false for AND, true for OR)</param>
    /// <param name="defaultResult">The result when all args evaluated without short-circuit (true for AND, false for OR)</param>
    private static EnvironmentValue<EvalExpr> ShortCircuitBooleanOp(
        EvalEnvironment env,
        CallExpr call,
        bool shortCircuitValue,
        bool defaultResult
    )
    {
        var deps = new List<ValueExpr>();
        var partialArgs = new List<EvalExpr>();
        var currentEnv = env;

        foreach (var arg in call.Args)
        {
            var (nextEnv, argPartial) = currentEnv.EvaluatePartial(arg);
            currentEnv = nextEnv;

            if (argPartial is not ValueExpr argResult)
            {
                // Argument is symbolic - return symbolic call with partially evaluated args
                partialArgs.AddRange(deps);
                partialArgs.Add(argPartial);
                partialArgs.AddRange(call.Args.Skip(partialArgs.Count));
                return currentEnv.WithValue<EvalExpr>(
                    new CallExpr(call.Function, partialArgs)
                );
            }

            deps.Add(argResult);

            // Short-circuit: if we hit the short-circuit value, stop evaluating
            if (argResult.Value is bool b && b == shortCircuitValue)
            {
                return currentEnv.WithValue<EvalExpr>(ValueExpr.WithDeps(shortCircuitValue, deps));
            }

            // If null, return null
            if (argResult.Value is null)
            {
                return currentEnv.WithValue<EvalExpr>(ValueExpr.WithDeps(null, deps));
            }

            // If not a valid boolean, return null
            if (argResult.Value is not bool || (bool)argResult.Value != !shortCircuitValue)
            {
                return currentEnv.WithValue<EvalExpr>(ValueExpr.WithDeps(null, deps));
            }
        }

        // All arguments evaluated without short-circuiting
        return currentEnv.WithValue<EvalExpr>(ValueExpr.WithDeps(defaultResult, deps));
    }

    private static readonly FunctionHandler ElemFunctionHandler = new FunctionHandler(
        (env, call) =>
        {
            if (call.Args.Count != 2)
            {
                return env.WithError("elem expects 2 arguments")
                    .WithValue<EvalExpr>(ValueExpr.Null);
            }
            var (env1, arrayPartial) = env.EvaluatePartial(call.Args[0]);
            var (env2, indexPartial) = env1.EvaluatePartial(call.Args[1]);

            if (arrayPartial is not ValueExpr arrayVal || indexPartial is not ValueExpr indexVal)
            {
                // Return symbolic elem call
                return env2.WithValue<EvalExpr>(new CallExpr("elem", [arrayPartial, indexPartial]));
            }

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
                        ? env2.WithValue<EvalExpr>(vl[ind]) // Neither index nor array has deps
                        : env2.WithValue<EvalExpr>(
                            vl[ind] with
                            {
                                Deps = DependencyHelpers.CombineDeps(indexVal, vl[ind], arrayVal),
                            }
                        )
                    : env2.WithValue<EvalExpr>(
                        vl[ind] with
                        {
                            Deps = DependencyHelpers.CombineDeps(indexVal, vl[ind], arrayVal),
                        }
                    ),
                _ => env2.WithValue<EvalExpr>(ValueExpr.WithDeps(null, [arrayVal, indexVal])),
            };
        }
    );

    private static FunctionHandler KeysOrValuesFunctionHandler(string type) =>
        new FunctionHandler(
            (e, c) =>
            {
                if (c.Args.Count != 1)
                {
                    return e.WithError($"{type} expects 1 argument")
                        .WithValue<EvalExpr>(ValueExpr.Null);
                }

                var (nextEnv, objPartial) = e.EvaluatePartial(c.Args[0]);

                if (objPartial is not ValueExpr objVal)
                {
                    // Return symbolic call
                    return nextEnv.WithValue<EvalExpr>(new CallExpr(type, [objPartial]));
                }

                return objVal.Value switch
                {
                    ObjectValue ov => nextEnv.WithValue<EvalExpr>(
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
                        .WithValue<EvalExpr>(ValueExpr.Null),
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

    public static EnvironmentValue<EvalExpr> WhichFunction(EvalEnvironment env, CallExpr call)
    {
        return call.Args.ToList() switch
        {
            [var cond, .. var others] when env.Evaluate(cond) is var (nextEnv, condValue) =>
                FindWhich(nextEnv, condValue, others),
            _ => env.WithError("which expects at least 1 argument")
                .WithValue<EvalExpr>(ValueExpr.Null)
        };

        EnvironmentValue<EvalExpr> FindWhich(
            EvalEnvironment curEnv,
            ValueExpr condValue,
            List<EvalExpr> others
        )
        {
            if (condValue.IsNull())
                return curEnv.WithValue<EvalExpr>(ValueExpr.Null);
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
                        .Map<EvalExpr>(x => ValueExpr.WithDeps(x.Value, [condValue, compValue, x]));
                }
                curEnv = nextEnv;
            }
            return curEnv.WithValue<EvalExpr>(ValueExpr.WithDeps(null, [condValue]));
        }
    }

    public static readonly Dictionary<string, FunctionHandler> FunctionHandlers = new()
    {
        { "+", NumberPartialOp("+", (d1, d2) => d1 + d2, (l1, l2) => l1 + l2) },
        { "-", NumberPartialOp("-", (d1, d2) => d1 - d2, (l1, l2) => l1 - l2) },
        { "*", NumberPartialOp("*", (d1, d2) => d1 * d2, (l1, l2) => l1 * l2) },
        { "/", NumberPartialOp("/", (d1, d2) => d1 / d2, (l1, l2) => (double)l1 / l2) },
        { "%", NumberPartialOp("%", (d1, d2) => d1 % d2, (l1, l2) => (double)l1 % l2) },
        { "=", ComparisonPartialFunc("=", v => v == 0) },
        { "!=", ComparisonPartialFunc("!=", v => v != 0) },
        { "<", ComparisonPartialFunc("<", x => x < 0) },
        { "<=", ComparisonPartialFunc("<=", x => x <= 0) },
        { ">", ComparisonPartialFunc(">", x => x > 0) },
        { ">=", ComparisonPartialFunc(">=", x => x >= 0) },
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
            FunctionHandler.DefaultEvalArgs(
                (e, x) =>
                    x switch
                    {
                        [var v, var o] when !v.IsNull() => v,
                        [var v, var o] => new ValueExpr(o.Value, o.Path, new[] { v, o }),
                        _ => ValueExpr.Null,
                    }
            )
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
            FunctionHandler.DefaultEval(args => new ArrayValue(
                args.SelectMany(x => new ValueExpr(x).AllValues())
            ))
        },
        {
            "notEmpty",
            FunctionHandler.DefaultEval(x =>
                x[0] switch
                {
                    string s => !string.IsNullOrWhiteSpace(s),
                    null => false,
                    _ => true,
                }
            )
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
            FunctionHandler.DefaultEval(a =>
                a switch
                {
                    [var numV, var digitsV]
                        when ValueExpr.MaybeDouble(numV) is { } num
                            && ValueExpr.MaybeDouble(digitsV) is { } digits => num.ToString(
                        "F" + (int)digits
                    ),
                    _ => null,
                }
            )
        },
        {
            "object",
            FunctionHandler.DefaultEvalArgs(
                (e, args) =>
                {
                    var i = 0;
                    var obj = new Dictionary<string, ValueExpr>();
                    while (i < args.Count - 1)
                    {
                        var name = (string)args[i++].Value!;
                        var value = args[i++];
                        obj[name] = value;
                    }
                    return new ValueExpr(new ObjectValue(obj));
                }
            )
        },
        { "this", new FunctionHandler((e, c) => e.WithValue<EvalExpr>(e.Current)) },
        { "keys", KeysOrValuesFunctionHandler("keys") },
        { "values", KeysOrValuesFunctionHandler("values") },
        {
            "merge",
            new FunctionHandler(
                (env, call) =>
                {
                    if (call.Args.Count == 0)
                    {
                        return env.WithError("merge expects at least 1 argument")
                            .WithValue<EvalExpr>(ValueExpr.Null);
                    }

                    var merged = new Dictionary<string, ValueExpr>();
                    var currentEnv = env;

                    foreach (var arg in call.Args)
                    {
                        var (nextEnv, argVal) = currentEnv.Evaluate(arg);
                        currentEnv = nextEnv;

                        if (argVal.IsNull())
                        {
                            return currentEnv.WithValue<EvalExpr>(ValueExpr.Null);
                        }

                        if (argVal.Value is ObjectValue ov)
                        {
                            foreach (var kvp in ov.Properties)
                            {
                                merged[kvp.Key] = kvp.Value;
                            }
                        }
                    }

                    return currentEnv.WithValue<EvalExpr>(new ValueExpr(new ObjectValue(merged)));
                }
            )
        },
        {
            "floor",
            FunctionHandler.DefaultEval(a =>
                a switch
                {
                    [var numV] when ValueExpr.MaybeDouble(numV) is { } num => Math.Floor(num),
                    _ => null,
                }
            )
        },
        {
            "ceil",
            FunctionHandler.DefaultEval(a =>
                a switch
                {
                    [var numV] when ValueExpr.MaybeDouble(numV) is { } num => Math.Ceiling(num),
                    _ => null,
                }
            )
        },
    };
}
