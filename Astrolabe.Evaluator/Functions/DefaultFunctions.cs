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
            var o
                => value with
                {
                    Value = o switch
                    {
                        null => "null",
                        bool b => b ? "true" : "false",
                        _ => o.ToString()
                    }
                },
        };
    }

    public static FunctionHandler UnaryNullOp(Func<object, object?> evaluate)
    {
        return FunctionHandler.DefaultEval(
            (args) =>
                args switch
                {
                    [{ } v1] => evaluate(v1),
                    [_] => null,
                    _ => throw new ArgumentException("Wrong number of args:" + args)
                }
        );
    }

    public static FunctionHandler BinOp(Func<object?, object?, object?> evaluate)
    {
        return FunctionHandler.DefaultEval(
            (args) =>
                args switch
                {
                    [var v1, var v2] => evaluate(v1, v2),
                    _ => throw new ArgumentException("Wrong number of args:" + args)
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
                    _ => throw new ArgumentException("Wrong number of args:" + args)
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
                    _ => throw new ArgumentException("Bad args for bool op")
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

    private static readonly FunctionHandler IfElseOp = FunctionHandler.DefaultEval(args =>
        args switch
        {
            [bool b, var thenVal, var elseVal] => b ? thenVal : elseVal,
            [null, _, _] => null,
            _ => throw new ArgumentException("Bad conditional: " + args),
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
                    [{ Value: ArrayValue av } singleArg]
                        => arrayFunc(av.Values.ToList(), singleArg),
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

    public static readonly Dictionary<string, FunctionHandler> FunctionHandlers =
        new()
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
            { "and", BoolOp((a, b) => a && b) },
            { "or", BoolOp((a, b) => a || b) },
            { "!", UnaryNullOp(a => a is bool b ? !b : null) },
            { "?", IfElseOp },
            {
                "??",
                FunctionHandler.DefaultEvalArgs(
                    (e, x) =>
                        x switch
                        {
                            [var v, var o] => v.IsNull() ? o : v,
                            _ => ValueExpr.Null
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
                        _ => true
                    }
                )
            },
            { "string", StringOp(x => x) },
            { "lower", StringOp(x => x.ToLower()) },
            { "upper", StringOp(x => x.ToUpper()) },
            { "which", new FunctionHandler(WhichFunction) },
            {
                "elem",
                FunctionHandler.DefaultEvalArgs(
                    (_, args) =>
                        args switch
                        {
                            [{ Value: ArrayValue av }, { Value: var indO }]
                                when ValueExpr.MaybeIndex(indO) is { } ind
                                    && av.Values.ToList() is var vl
                                    && vl.Count > ind
                                => vl[ind],
                            _ => ValueExpr.WithDeps(null, args)
                        }
                )
            },
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
                    (i, v, r, env) =>
                        env.Compare(v[i].Value, r.Value) == 0 ? ValueExpr.From(i) : null
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
                                && ValueExpr.MaybeDouble(digitsV) is { } digits
                            => num.ToString("F" + (int)digits),
                        _ => null
                    }
                )
            },
            {
                "object",
                FunctionHandler.DefaultEval(args =>
                {
                    var i = 0;
                    var obj = new JsonObject();
                    while (i < args.Count - 1)
                    {
                        var name = (string)args[i++]!;
                        var value = ToJsonNode(args[i++]);
                        obj[name] = value;
                    }
                    return new ObjectValue(obj);
                })
            },
            { "this", new FunctionHandler((e, c) => e.WithValue(e.Current)) }
        };

    public static JsonNode? ToJsonNode(object? objValue)
    {
        return objValue switch
        {
            ObjectValue ov => ((JsonObject)ov.Object).DeepClone(),
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
            [var cond, .. var others] when env.Evaluate(cond) is var (nextEnv, condValue)
                => FindWhich(nextEnv, condValue, others)
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
                        .Map(x => ValueExpr.WithDeps(x.Value, [condValue, compValue]));
                }
                curEnv = nextEnv;
            }
            return curEnv.WithValue(ValueExpr.WithDeps(null, [condValue]));
        }
    }
}
