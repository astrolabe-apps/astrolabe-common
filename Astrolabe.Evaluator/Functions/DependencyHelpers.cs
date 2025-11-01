namespace Astrolabe.Evaluator.Functions;

/// <summary>
/// Helper methods for combining paths and dependencies in evaluator functions.
/// </summary>
public static class DependencyHelpers
{
    /// <summary>
    /// Combines dependencies from index/key expression, element expression, and optional parent expression.
    /// Used when accessing array elements or object properties to properly track all dependencies.
    /// Stores ValueExpr references instead of extracting paths (lazy evaluation).
    /// </summary>
    /// <param name="indexExpr">The index or key expression (may be constant or dynamic)</param>
    /// <param name="elementExpr">The accessed element or property value</param>
    /// <param name="parentExpr">Optional parent array or object expression</param>
    /// <returns>Combined list of all dependency ValueExprs</returns>
    public static IEnumerable<ValueExpr> CombineDeps(
        ValueExpr indexExpr,
        ValueExpr elementExpr,
        ValueExpr? parentExpr = null
    )
    {
        var combined = new List<ValueExpr> { indexExpr };

        // Add parent (array/object) dependencies
        if (parentExpr?.Deps != null)
            combined.AddRange(parentExpr.Deps);

        // Add element dependencies
        if (elementExpr.Deps != null)
            combined.AddRange(elementExpr.Deps);

        return combined;
    }
}