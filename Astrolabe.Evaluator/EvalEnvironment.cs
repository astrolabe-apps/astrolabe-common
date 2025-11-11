using System.Collections.Immutable;

namespace Astrolabe.Evaluator;

using EvaluatedExpr = EnvironmentValue<ValueExpr>;

public record EvalData(ValueExpr Root, Func<ValueExpr, string, ValueExpr> GetProperty);

public record EvalEnvironmentState(
    EvalData Data,
    ValueExpr Current,
    Func<object?, object?, int> Compare,
    ImmutableDictionary<string, EvalExpr> LocalVariables,
    EvalEnvironmentState? Parent,
    IEnumerable<EvalError> Errors
)
{
    public static EvalEnvironmentState EmptyState(EvalData data)
    {
        return new EvalEnvironmentState(
            data,
            data.Root,
            EvalEnvironment.DefaultComparison,
            ImmutableDictionary<string, EvalExpr>.Empty,
            null,
            []
        );
    }

    /// <summary>
    /// Look up a variable in the scope chain.
    /// Walks from current scope up through parents until found.
    /// O(depth) complexity where depth is typically 2-5 scopes.
    /// </summary>
    public EvalExpr? LookupVariable(string name)
    {
        if (LocalVariables.TryGetValue(name, out var value))
        {
            return value;
        }
        return Parent?.LookupVariable(name);
    }
}

public class EvalEnvironment(EvalEnvironmentState state)
{
    public EvalEnvironmentState State => state;

    public EvalData Data => state.Data;

    public ValueExpr Current => state.Current;

    public IEnumerable<EvalError> Errors => state.Errors;

    public static readonly Func<object?, object?, int> DefaultComparison = CompareSignificantDigits(
        5
    );

    public static Func<object?, object?, int> CompareSignificantDigits(int digits)
    {
        var multiply = (long)Math.Pow(10, digits);
        return (v1, v2) =>
            (v1, v2) switch
            {
                (long l1, long l2) => l1.CompareTo(l2),
                (int i1, int i2) => i1.CompareTo(i2),
                (long l1, int i2) => l1.CompareTo(i2),
                (int i1, long l2) => -l2.CompareTo(i1),
                (_, double d2) => NumberCompare(ValueExpr.AsDouble(v1), d2),
                (double d1, _) => NumberCompare(d1, ValueExpr.AsDouble(v2)),
                (string s1, string s2) => string.Compare(s1, s2, StringComparison.InvariantCulture),
                _
                    => Equals(v1, v2)
                        ? 0
                        : v1 == null
                            ? 1
                            : -1
            };

        int NumberCompare(double d1, double d2)
        {
            var l1 = (long)Math.Round(d1 * multiply);
            var l2 = (long)Math.Round(d2 * multiply);
            return l1.CompareTo(l2);
        }
    }

    public EvalEnvironment WithComparison(Func<object?, object?, int> comparison)
    {
        return NewEnv(state with { Compare = comparison });
    }

    public ValueExpr GetProperty(string property)
    {
        return state.Data.GetProperty(state.Current, property);
    }

    public EvalExpr? GetVariable(string name)
    {
        return state.LookupVariable(name);
    }

    protected virtual EvalEnvironment NewEnv(EvalEnvironmentState newState)
    {
        return new EvalEnvironment(newState);
    }

    public EvalEnvironment RemoveVariable(string name)
    {
        return NewEnv(state with { LocalVariables = state.LocalVariables.Remove(name) });
    }

    public virtual EvalEnvironment WithVariable(string name, EvalExpr value)
    {
        var (e, varValue) = Evaluate(value);
        // Create a new child scope with this single variable
        // The new scope has only this variable in LocalVariables
        // and points to the current scope as parent
        return e.NewEnv(e.State with
        {
            LocalVariables = ImmutableDictionary<string, EvalExpr>.Empty.Add(name, varValue),
            Parent = e.State
        });
    }

    public virtual EvalEnvironment WithVariables(ICollection<KeyValuePair<string, EvalExpr>> vars)
    {
        // Optimize: Create a single child scope with all variables
        // instead of nested scopes (one per variable)
        if (vars.Count == 0)
        {
            return this;
        }

        if (vars.Count == 1)
        {
            // Single variable - use existing WithVariable
            var single = vars.First();
            return WithVariable(single.Key, single.Value);
        }

        // Evaluate all variables sequentially, making each available to the next
        var currentEnv = this;
        var evaluatedVars = ImmutableDictionary<string, EvalExpr>.Empty.ToBuilder();

        foreach (var (name, expr) in vars)
        {
            var (nextEnv, value) = currentEnv.Evaluate(expr);
            evaluatedVars[name] = value;
            // Create environment with all variables evaluated so far
            // This allows subsequent variables to reference earlier ones
            currentEnv = NewEnv(nextEnv.State with
            {
                LocalVariables = evaluatedVars.ToImmutable(),
                Parent = this.State
            });
        }

        // Return the final environment that already has all variables
        return currentEnv;
    }

    public EvalEnvironment WithCurrent(ValueExpr current)
    {
        return NewEnv(state with { Current = current });
    }

    public EvalEnvironment WithError(string message)
    {
        return NewEnv(state with { Errors = state.Errors.Append(new EvalError(message)) });
    }

    public static EvalEnvironment DataFrom(EvalData data)
    {
        return new EvalEnvironment(EvalEnvironmentState.EmptyState(data));
    }

    public virtual EnvironmentValue<ValueExpr> Evaluate(EvalExpr evalExpr)
    {
        return this.DefaultEvaluate(evalExpr);
    }

    public int Compare(object? v1, object? v2)
    {
        return State.Compare(v1, v2);
    }
}

public interface EnvironmentValue<out T>
{
    EvalEnvironment Env { get; }
    T Value { get; }

    EnvironmentValue<T2> Map<T2>(Func<T, EvalEnvironment, T2> select);

    EnvironmentValue<T2> Map<T2>(Func<T, T2> select);

    EnvironmentValue<T> EnvMap(Func<EvalEnvironment, EvalEnvironment> envFunc);
}

public record BasicEnvironmentValue<T>(EvalEnvironment Env, T Value) : EnvironmentValue<T>
{
    public ValueExpr AsValue()
    {
        return (ValueExpr)(object)Value!;
    }

    public EnvironmentValue<T2> Map<T2>(Func<T, EvalEnvironment, T2> select)
    {
        return Env.WithValue(select(Value, Env));
    }

    public EnvironmentValue<T2> Map<T2>(Func<T, T2> select)
    {
        return Env.WithValue(select(Value));
    }

    public EnvironmentValue<T> EnvMap(Func<EvalEnvironment, EvalEnvironment> envFunc)
    {
        return this with { Env = envFunc(Env) };
    }
}

public static class EvalEnvironmentExtensions
{
    public static void Deconstruct<T>(
        this EnvironmentValue<T> ev,
        out EvalEnvironment env,
        out T value
    )
    {
        env = ev.Env;
        value = ev.Value;
    }

    public static EnvironmentValue<IEnumerable<T>> Single<T>(this EnvironmentValue<T> ev)
    {
        return ev.Map<IEnumerable<T>>(x => [x]);
    }

    public static T2 Run<T, T2>(this EnvironmentValue<T> ev, Func<EnvironmentValue<T>, T2> select)
    {
        return select(ev);
    }

    public static EnvironmentValue<T> WithCurrent<T>(this EnvironmentValue<T> ev, ValueExpr current)
    {
        return ev.EnvMap(x => x.WithCurrent(current));
    }

    public static EvalEnvironment EvalForEach<T>(
        this EvalEnvironment env,
        IEnumerable<T> evalList,
        Func<EvalEnvironment, T, EvalEnvironment> evalFunc
    )
    {
        return evalList.Aggregate(env, evalFunc);
    }

    public static EnvironmentValue<IEnumerable<T>> SingleOrEmpty<T>(
        this EnvironmentValue<T?> evalResult
    )
    {
        return evalResult.Env.WithValue<IEnumerable<T>>(
            evalResult.Value != null ? [evalResult.Value] : []
        );
    }

    public static EnvironmentValue<IEnumerable<object?>> Singleton(this EvaluatedExpr evalExpr)
    {
        return evalExpr.Map<IEnumerable<object?>>(x => [x.Value]);
    }

    public static EvaluatedExpr IfElse(
        this EvaluatedExpr evalExpr,
        EvalExpr trueExpr,
        EvalExpr falseExpr
    )
    {
        return evalExpr.Value.IsNull()
            ? evalExpr
            : evalExpr.Env.Evaluate(evalExpr.Value.AsBool() ? trueExpr : falseExpr);
    }

    public static EnvironmentValue<IEnumerable<ValueExpr>> AppendTo(
        this EvaluatedExpr acc,
        EnvironmentValue<IEnumerable<ValueExpr>> other
    )
    {
        return acc.Env.WithValue(
            acc.Value != ValueExpr.Undefined ? other.Value.Append(acc.Value) : other.Value
        );
    }

    public static EnvironmentValue<IEnumerable<TResult>> EvalSelect<T, TResult>(
        this EvalEnvironment env,
        IEnumerable<T> evalList,
        Func<EvalEnvironment, T, EnvironmentValue<TResult>> evalFunc
    )
    {
        return evalList.Aggregate(
            env.WithEmpty<TResult>(),
            (allResults, r) =>
            {
                var result = evalFunc(allResults.Env, r);
                return result.Map(x => allResults.Value.Append(x));
            }
        );
    }

    public static EnvironmentValue<IEnumerable<TResult>> EvalConcat<T, TResult>(
        this EvalEnvironment env,
        IEnumerable<T> evalList,
        Func<EvalEnvironment, T, EnvironmentValue<IEnumerable<TResult>>> evalFunc
    )
    {
        return evalList.Aggregate(
            env.WithEmpty<TResult>(),
            (allResults, r) =>
            {
                var result = evalFunc(allResults.Env, r);
                return result.AppendTo(allResults);
            }
        );
    }

    public static EnvironmentValue<T> WithValue<T>(this EvalEnvironment env, T result)
    {
        return new BasicEnvironmentValue<T>(env, result);
    }

    public static EnvironmentValue<IEnumerable<T>> WithEmpty<T>(this EvalEnvironment env)
    {
        return env.WithValue<IEnumerable<T>>([]);
    }

    public static EvaluatedExpr WithNull(this EvalEnvironment env)
    {
        return env.WithValue(ValueExpr.Null);
    }

    public static EnvironmentValue<IEnumerable<T>> AppendTo<T>(
        this EnvironmentValue<IEnumerable<T>> envResult,
        EnvironmentValue<IEnumerable<T>> other
    )
    {
        return envResult.Map<IEnumerable<T>>(x => other.Value.Concat(x));
    }
}

public record EvalError(string Message);
