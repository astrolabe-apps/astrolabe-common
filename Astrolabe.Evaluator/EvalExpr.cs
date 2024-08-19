using System.Collections;
using System.ComponentModel.DataAnnotations;
using Astrolabe.Annotation;

namespace Astrolabe.Evaluator;

[JsonString]
public enum InbuiltFunction
{
    [Display(Name = "=")]
    Eq,

    [Display(Name = "!=")]
    Ne,

    [Display(Name = "<")]
    Lt,

    [Display(Name = "<=")]
    LtEq,

    [Display(Name = ">")]
    Gt,

    [Display(Name = ">=")]
    GtEq,

    [Display(Name = "NotEmpty")]
    NotEmpty,
}

public static class InbuiltFunctions
{
    public static string VariableName(this InbuiltFunction func)
    {
        return func switch
        {
            InbuiltFunction.Eq => "=",
            InbuiltFunction.Lt => "<",
            InbuiltFunction.LtEq => "<=",
            InbuiltFunction.Gt => ">",
            InbuiltFunction.GtEq => ">=",
            InbuiltFunction.Ne => "!=",
            InbuiltFunction.NotEmpty => "notEmpty",
            _ => throw new ArgumentException("Not an Inbuilt:" + func)
        };
    }
}

public interface EvalExpr;

public record LetExpr(IEnumerable<(VarExpr, EvalExpr)> Vars, EvalExpr In) : EvalExpr
{
    public static LetExpr AddVar(LetExpr? letExpr, VarExpr varExpr, EvalExpr expr)
    {
        var varTuple = (varExpr, expr);
        if (letExpr == null)
            return new LetExpr([varTuple], ValueExpr.Null);
        return letExpr with { Vars = letExpr.Vars.Append(varTuple) };
    }
}

public record PropertyExpr(string Property) : EvalExpr;

public record LambdaExpr(string Variable, EvalExpr Value) : EvalExpr;

public delegate EnvironmentValue<T> CallHandler<T>(EvalEnvironment environment, CallExpr callExpr);

public record FunctionHandler(CallHandler<ValueExpr> Evaluate)
{
    public static FunctionHandler DefaultEvalArgs(
        Func<EvalEnvironment, List<ValueExpr>, ValueExpr> eval
    ) =>
        new(
            (e, call) =>
                e.EvalSelect(call.Args, (e2, x) => e2.Evaluate(x))
                    .Map(args => eval(e, args.ToList()))
        );

    public static FunctionHandler DefaultEval(Func<EvalEnvironment, List<object?>, object?> eval) =>
        DefaultEvalArgs(
            (e, args) => ValueExpr.WithDeps(eval(e, args.Select(x => x.Value).ToList()), args)
        );

    public static FunctionHandler DefaultEval(Func<IList<object?>, object?> eval) =>
        DefaultEval((_, a) => eval(a));
}

public record ValueExpr(object? Value, DataPath? Path = null, IEnumerable<DataPath>? Deps = null)
    : EvalExpr
{
    public static readonly ValueExpr Null = new((object?)null);

    public static readonly ValueExpr False = new(false);

    public static readonly ValueExpr True = new(true);

    private static readonly object UndefinedValue = new();

    public static readonly ValueExpr Undefined = new(UndefinedValue);

    public static ValueExpr WithDeps(object? value, IEnumerable<ValueExpr> others)
    {
        return new ValueExpr(
            value,
            null,
            others.SelectMany(x =>
                ((IEnumerable<DataPath>)(x.Path != null ? [x.Path] : [])).Concat(x.Deps ?? [])
            )
        );
    }

    public static double AsDouble(object? v)
    {
        return v switch
        {
            int i => i,
            long l => l,
            double d => d,
            _ => throw new ArgumentException("Value is not a number: " + (v ?? "null"))
        };
    }

    public long? MaybeInteger()
    {
        return MaybeInteger(Value);
    }

    public static long? MaybeInteger(object? v)
    {
        return v switch
        {
            int i => i,
            long l => l,
            _ => null
        };
    }

    public double? MaybeDouble()
    {
        return MaybeDouble(Value);
    }

    public static int? MaybeIndex(object? v)
    {
        return v switch
        {
            int i => i,
            long l => (int)l,
            double d => (int)d,
            _ => null
        };
    }

    public static double? MaybeDouble(object? v)
    {
        return v switch
        {
            int i => i,
            long l => l,
            double d => d,
            _ => null
        };
    }

    public static ValueExpr From(bool? v)
    {
        return new ValueExpr(v);
    }

    public static ValueExpr From(string? v)
    {
        return new ValueExpr(v);
    }

    public static ValueExpr From(ArrayValue? v)
    {
        return new ValueExpr(v);
    }

    public static ValueExpr From(int? v)
    {
        return new ValueExpr(v);
    }

    public static ValueExpr From(long? v)
    {
        return new ValueExpr(v);
    }

    public object? ToNative()
    {
        return ToNative(Value);
    }

    public static object? ToNative(object? v)
    {
        return v switch
        {
            ArrayValue av => av.Values.Select(x => x.ToNative()),
            ObjectValue ov => ov.Object,
            _ => v
        };
    }

    public IEnumerable<ValueExpr> AllValues()
    {
        return Value switch
        {
            ArrayValue av => av.Values.SelectMany(x => x.AllValues()),
            _ => [this]
        };
    }
}

public record ArrayExpr(IEnumerable<EvalExpr> Values) : EvalExpr
{
    public override string ToString()
    {
        return $"ArrayExpr [{string.Join(", ", Values)}]";
    }
}

public record CallExpr(string Function, IList<EvalExpr> Args) : EvalExpr
{
    public override string ToString()
    {
        return $"{Function}({string.Join(", ", Args)})";
    }

    public CallExpr WithArgs(IEnumerable<EvalExpr> args)
    {
        return this with { Args = args.ToList() };
    }

    public static EvalExpr Inbuilt(InbuiltFunction inbuilt, IEnumerable<EvalExpr> args)
    {
        return new CallExpr(inbuilt.VariableName(), args.ToList());
    }

    public static EvalExpr And(EvalExpr expr, EvalExpr other)
    {
        return new CallExpr("and", [expr, other]);
    }

    public static EvalExpr Map(EvalExpr expr, EvalExpr other)
    {
        return new CallExpr(".", [expr, other]);
    }
}

public record VarExpr(string Name) : EvalExpr
{
    private static int _indexCount;

    public override string ToString()
    {
        return $"${Name}";
    }

    public static VarExpr MakeNew(string name)
    {
        return new VarExpr(name + (++_indexCount));
    }

    public VarExpr Prepend(string extra)
    {
        return new VarExpr(extra + Name);
    }

    public EvalExpr Append(string append)
    {
        return new VarExpr(Name + append);
    }
}

public record ArrayValue(IEnumerable<ValueExpr> Values);

public record ObjectValue(object Object);

public static class ValueExtensions
{
    public static bool IsData(this EvalExpr expr)
    {
        return expr is ValueExpr { Value: DataPath dp };
    }

    public static bool IsValue(this EvalExpr expr)
    {
        return expr is ValueExpr;
    }

    public static ValueExpr? MaybeValue(this EvalExpr expr)
    {
        return expr as ValueExpr;
    }

    public static bool IsNull(this EvalExpr expr)
    {
        return expr is ValueExpr { Value: null };
    }

    public static ValueExpr AsValue(this EvalExpr expr)
    {
        return (ValueExpr)expr;
    }

    public static VarExpr AsVar(this EvalExpr expr)
    {
        return (VarExpr)expr;
    }

    public static ArrayValue AsArray(this ValueExpr v)
    {
        return (v.Value as ArrayValue)!;
    }

    public static bool AsBool(this ValueExpr v)
    {
        return (bool)v.Value!;
    }

    public static int AsInt(this ValueExpr v)
    {
        return v.Value switch
        {
            double d => (int)d,
            long l => (int)l,
            int i => i
        };
    }

    public static double AsDouble(this ValueExpr v)
    {
        return ValueExpr.AsDouble(v.Value);
    }

    public static bool IsNull(this ValueExpr v)
    {
        return v.Value == null;
    }

    public static bool IsTrue(this ValueExpr v)
    {
        return v.Value is true;
    }

    public static bool IsFalse(this ValueExpr v)
    {
        return v.Value is false;
    }

    public static string AsString(this ValueExpr v)
    {
        return (string)v.Value!;
    }
}
