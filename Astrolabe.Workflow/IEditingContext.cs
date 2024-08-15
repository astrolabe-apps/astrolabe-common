namespace Astrolabe.Workflow;

public interface IEditingContext<out T>
{
    T? Original { get; }
    T Edited { get; }

    bool Changed { get; }

    IEditingContext<T2>? As<T2>()
        where T2 : class => Edited is T2 e ? new SimpleEditingContext<T2>(Original as T2, e) : null;
}

public record SimpleEditingContext<T>(T? Original, T Edited) : IEditingContext<T>
{
    public bool Changed => !Equals(Original, Edited);
}

public class MappedEditingContext<T, T2>(IEditingContext<T> originalContext, Func<T, T2> mapper)
    : IEditingContext<T2>
{
    public T2? Original { get; } = originalContext.Original is { } v ? mapper(v) : default;
    public T2 Edited { get; } = mapper(originalContext.Edited);
    public bool Changed => !Equals(Original, Edited);
}

public static class WorkflowEditContextExtensions
{
    public static IEditingContext<T2> Map<T, T2>(this IEditingContext<T> original, Func<T, T2> m) =>
        new MappedEditingContext<T, T2>(original, m);

    public static IEditingContext<T> MakeContext<T>(T? original, T edited)
    {
        return new SimpleEditingContext<T>(original, edited);
    }

    public static bool ChangedTo<T, TValue>(
        this IEditingContext<T> context,
        Func<T, TValue> getter,
        TValue compare
    )
    {
        if (!Equals(getter(context.Edited), compare))
            return false;
        var orig = context.Original;
        return orig == null || !Equals(getter(orig), compare);
    }

    public static bool ChangedFrom<T, TValue>(
        this IEditingContext<T> context,
        Func<T, TValue> getter,
        TValue compare
    )
    {
        var orig = context.Original;
        if (orig == null)
            return false;
        var oldValue = getter(orig);
        if (Equals(oldValue, compare))
        {
            return !Equals(getter(context.Edited), compare);
        }

        return false;
    }
}
