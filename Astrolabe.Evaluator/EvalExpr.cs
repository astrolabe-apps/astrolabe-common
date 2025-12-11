using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.Annotation;

namespace Astrolabe.Evaluator;

public record SourceLocation(int Start, int End, string? SourceFile = null);

/// <summary>
/// Represents an error with its source location and dependent errors.
/// </summary>
public record ErrorWithLocation(
    string Message,
    SourceLocation? Location,
    IReadOnlyList<ErrorWithLocation> Deps
);

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
            _ => throw new ArgumentException("Not an Inbuilt:" + func),
        };
    }
}

public interface EvalExpr
{
    /// <summary>
    /// Source location for error reporting and debugging.
    /// </summary>
    SourceLocation? Location { get; }

    /// <summary>
    /// Generic metadata dictionary for internal use by evaluation environments.
    /// Used for tracking inlined variables (InlineData) and other metadata.
    /// </summary>
    IReadOnlyDictionary<string, object?>? Data { get; }
}

public record LetExpr(
    IEnumerable<(VarExpr, EvalExpr)> Vars,
    EvalExpr In,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr
{
    public static LetExpr AddVar(LetExpr? letExpr, VarExpr varExpr, EvalExpr expr)
    {
        var varTuple = (varExpr, expr);
        if (letExpr == null)
            return new LetExpr([varTuple], ValueExpr.Null);
        return letExpr with { Vars = letExpr.Vars.Append(varTuple) };
    }
}

public record PropertyExpr(
    string Property,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr;

public record LambdaExpr(
    string Variable,
    EvalExpr Value,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr;

/// <summary>
/// Function handler that takes an EvalEnv and CallExpr, returns EvalExpr directly.
/// Used by the EvalEnv-based evaluation system.
/// </summary>
public delegate EvalExpr FunctionHandler(EvalEnv env, CallExpr call);

public record ValueExpr(
    object? Value,
    DataPath? Path = null,
    IEnumerable<ValueExpr>? Deps = null,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null,
    string? Error = null
) : EvalExpr
{
    public static readonly ValueExpr Null = new((object?)null);

    public static readonly ValueExpr False = new(false);

    public static readonly ValueExpr True = new(true);

    private static readonly object UndefinedValue = new();

    public static readonly ValueExpr Undefined = new(UndefinedValue);

    /// <summary>
    /// Create a ValueExpr with an error message attached.
    /// </summary>
    public static ValueExpr WithError(object? value, string error)
    {
        return new ValueExpr(value, Error: error);
    }

    public static ValueExpr WithDeps(object? value, IEnumerable<ValueExpr> others)
    {
        var othersList = others.ToList();
        return new ValueExpr(value, null, othersList.Count > 0 ? othersList : null);
    }

    /// <summary>
    /// Recursively extract all paths from a ValueExpr and its dependencies.
    /// Lazily extracts paths when needed instead of storing them upfront.
    /// </summary>
    public static IEnumerable<DataPath> ExtractAllPaths(ValueExpr expr)
    {
        var paths = new List<DataPath>();
        var seen = new HashSet<ValueExpr>();

        void Extract(ValueExpr ve)
        {
            if (!seen.Add(ve))
                return; // Already seen, avoid cycles

            if (ve.Path != null)
                paths.Add(ve.Path);
            if (ve.Deps != null)
            {
                // Recursively extract paths from all dependency ValueExprs
                foreach (var dep in ve.Deps)
                {
                    Extract(dep);
                }
            }
        }

        Extract(expr);
        return paths;
    }

    /// <summary>
    /// Recursively collect all errors from a ValueExpr and its dependencies.
    /// Handles circular references via visited set.
    /// </summary>
    public static IEnumerable<string> CollectAllErrors(ValueExpr expr)
    {
        var errors = new List<string>();
        var seen = new HashSet<ValueExpr>();

        void Collect(ValueExpr ve)
        {
            if (!seen.Add(ve))
                return; // Already seen, avoid cycles

            if (ve.Error != null)
                errors.Add(ve.Error);
            if (ve.Deps != null)
            {
                foreach (var dep in ve.Deps)
                {
                    Collect(dep);
                }
            }
        }

        Collect(expr);
        return errors;
    }

    /// <summary>
    /// Collects all errors from a ValueExpr with their locations and dependent errors.
    /// Returns a hierarchical structure where each error contains its dependent errors.
    /// </summary>
    public static IEnumerable<ErrorWithLocation> CollectErrorsWithLocations(ValueExpr expr)
    {
        var seen = new HashSet<ValueExpr>();
        return Collect(expr);

        IReadOnlyList<ErrorWithLocation> Collect(ValueExpr ve)
        {
            if (!seen.Add(ve))
                return [];

            // Recursively collect errors from dependencies
            var depErrors = ve.Deps?.SelectMany(Collect).ToList() ?? [];

            if (ve.Error != null)
            {
                return [new ErrorWithLocation(ve.Error, ve.Location, depErrors)];
            }

            return depErrors;
        }
    }

    public static double AsDouble(object? v)
    {
        return v switch
        {
            int i => i,
            long l => l,
            double d => d,
            _ => throw new ArgumentException("Value is not a number: " + (v ?? "null")),
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
            _ => null,
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
            _ => null,
        };
    }

    public static double? MaybeDouble(object? v)
    {
        return v switch
        {
            int i => i,
            long l => l,
            double d => d,
            _ => null,
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

    public static ValueExpr From(double? v)
    {
        return new ValueExpr(v);
    }

    public static ValueExpr From(decimal? v)
    {
        return new ValueExpr((double?)v);
    }

    public static ValueExpr FromNative(object? obj)
    {
        return obj switch
        {
            null => Null,
            short s => From((int)s),
            decimal d => From(d),
            ValueExpr ve => ve,
            JsonNode jn => JsonDataLookup.ToValue(DataPath.Empty, jn),
            JsonElement je => JsonDataLookup.ToValue(DataPath.Empty, je),
            IEnumerable<KeyValuePair<string, object?>> kvs => new ValueExpr(
                new ObjectValue(kvs.ToDictionary(kv => kv.Key, kv => FromNative(kv.Value)))
            ),
            _ => new ValueExpr(obj),
        };
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
            ObjectValue ov => ov.Properties.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.ToNative()
            ),
            _ => v,
        };
    }

    /// <summary>
    /// Extract all elements from nested arrays, adding parent deps at extraction time.
    /// This implements lazy deps propagation - children get parent deps when extracted.
    /// </summary>
    public IEnumerable<ValueExpr> AllValues(ValueExpr? parent = null)
    {
        return Value switch
        {
            ArrayValue av => av.Values.SelectMany(child => child.AllValues(this)),
            _ => parent?.Deps is { } parentDeps && parentDeps.Any()
                ? [this with { Deps = (Deps ?? Enumerable.Empty<ValueExpr>()).Concat([parent]) }]
                : [this],
        };
    }
}

public record ArrayExpr(
    IEnumerable<EvalExpr> Values,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr
{
    public override string ToString()
    {
        return $"ArrayExpr [{string.Join(", ", Values)}]";
    }
}

public record CallExpr(
    string Function,
    IList<EvalExpr> Args,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr
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

public record VarExpr(
    string Name,
    SourceLocation? Location = null,
    IReadOnlyDictionary<string, object?>? Data = null
) : EvalExpr
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

public record ObjectValue(IDictionary<string, ValueExpr> Properties);

public static class ValueExtensions
{
    /// <summary>
    /// Creates a ValueExpr with an error, copying the location from the source expression.
    /// </summary>
    public static ValueExpr WithError(this EvalExpr expr, string error)
    {
        return new ValueExpr(null, Location: expr.Location, Error: error);
    }

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

    public static bool IsString(this EvalExpr expr)
    {
        return expr is ValueExpr { Value: string };
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

    public static ArrayValue ToArray(this ValueExpr v)
    {
        return v.Value switch
        {
            ArrayValue av => av,
            _ => new ArrayValue([v]),
        };
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
            int i => i,
        };
    }

    public static long AsLong(this ValueExpr v)
    {
        return v.Value switch
        {
            double d => (long)d,
            long l => l,
            int i => i,
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

    public static bool IsTrue(this EvalExpr v)
    {
        return v is ValueExpr { Value: true };
    }

    public static bool IsFalse(this EvalExpr v)
    {
        return v is ValueExpr { Value: false };
    }

    public static string AsString(this ValueExpr v)
    {
        return (string)v.Value!;
    }
}

public static class EvalExprDataExtensions
{
    public static T? GetData<T>(this EvalExpr expr, string key)
        where T : class => expr.Data?.TryGetValue(key, out var value) == true ? value as T : null;

    public static bool HasData(this EvalExpr expr, string key) =>
        expr.Data?.ContainsKey(key) == true;

    public static EvalExpr WithData(this EvalExpr expr, string key, object? value)
    {
        var newData =
            expr.Data != null
                ? new Dictionary<string, object?>(expr.Data) { [key] = value }
                : new Dictionary<string, object?> { [key] = value };
        return SetDataDirect(expr, newData);
    }

    public static EvalExpr WithoutData(this EvalExpr expr, string key)
    {
        if (expr.Data == null || !expr.Data.ContainsKey(key))
            return expr;
        var newData = expr
            .Data.Where(kvp => kvp.Key != key)
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        return SetDataDirect(expr, newData.Count > 0 ? newData : null);
    }

    private static EvalExpr SetDataDirect(
        EvalExpr expr,
        IReadOnlyDictionary<string, object?>? data
    ) =>
        expr switch
        {
            ValueExpr v => v with { Data = data },
            VarExpr vr => vr with { Data = data },
            CallExpr c => c with { Data = data },
            ArrayExpr a => a with { Data = data },
            LetExpr l => l with { Data = data },
            PropertyExpr p => p with { Data = data },
            LambdaExpr lm => lm with { Data = data },
            _ => expr,
        };
}
