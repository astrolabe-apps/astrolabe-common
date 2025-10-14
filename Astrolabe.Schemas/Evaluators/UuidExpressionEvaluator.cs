namespace Astrolabe.Schemas;

/// <summary>
/// Evaluates UUID expression by generating a new GUID.
/// This is non-reactive - returns a constant GUID value.
/// </summary>
public static class UuidExpressionEvaluator
{
    public static IDisposable Evaluate(
        EntityExpression expression,
        ExpressionEvalContext context,
        Action<object?> returnResult)
    {
        // Non-reactive: just generate a GUID once
        returnResult(Guid.NewGuid().ToString());

        // Return empty disposable (no subscriptions to clean up)
        return EmptyDisposable.Instance;
    }

    private class EmptyDisposable : IDisposable
    {
        public static readonly EmptyDisposable Instance = new();
        public void Dispose() { }
    }
}