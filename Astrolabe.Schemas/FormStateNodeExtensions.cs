namespace Astrolabe.Schemas;

/// <summary>
/// Extension methods for IFormStateNode including visitor patterns.
/// </summary>
public static class FormStateNodeExtensions
{
    /// <summary>
    /// Visits form state tree in depth-first order, returning first non-null result.
    /// Matches TypeScript visitFormState behavior.
    /// </summary>
    /// <typeparam name="A">Return type (must be reference type)</typeparam>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="visitFn">Function called for each node, return non-null to stop traversal</param>
    /// <returns>First non-null result from visitFn, or null if none found</returns>
    public static A? VisitFormState<A>(
        this IFormStateNode node,
        Func<IFormStateNode, A?> visitFn
    ) where A : class
    {
        var result = visitFn(node);
        if (result != null) return result;

        foreach (var child in node.Children)
        {
            var childResult = child.VisitFormState(visitFn);
            if (childResult != null) return childResult;
        }

        return null;
    }

    /// <summary>
    /// Visits all nodes in the form state tree (no early termination).
    /// Useful for side effects like rendering all nodes.
    /// </summary>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="visitFn">Function called for each node</param>
    public static void VisitAllFormState(
        this IFormStateNode node,
        Action<IFormStateNode> visitFn
    )
    {
        visitFn(node);
        foreach (var child in node.Children)
        {
            child.VisitAllFormState(visitFn);
        }
    }

    /// <summary>
    /// Collects non-null results from all nodes in the tree.
    /// </summary>
    /// <typeparam name="A">Result type (must be reference type)</typeparam>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="visitFn">Function called for each node to produce result</param>
    /// <returns>Enumerable of all non-null results</returns>
    public static IEnumerable<A> CollectFromFormState<A>(
        this IFormStateNode node,
        Func<IFormStateNode, A?> visitFn
    ) where A : class
    {
        var result = visitFn(node);
        if (result != null)
            yield return result;

        foreach (var child in node.Children)
        {
            foreach (var childResult in child.CollectFromFormState(visitFn))
            {
                yield return childResult;
            }
        }
    }

    /// <summary>
    /// Visits with parent context for relative operations.
    /// </summary>
    /// <typeparam name="TContext">Context type to pass through traversal</typeparam>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="context">Context object passed to each visit</param>
    /// <param name="visitFn">Function called with node, parent, and context</param>
    public static void VisitFormStateWithParent<TContext>(
        this IFormStateNode node,
        TContext context,
        Action<IFormStateNode, IFormStateNode?, TContext> visitFn
    )
    {
        visitFn(node, node.ParentNode, context);
        foreach (var child in node.Children)
        {
            child.VisitFormStateWithParent(context, visitFn);
        }
    }

    /// <summary>
    /// Conditional visitor that can skip subtrees.
    /// </summary>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="shouldVisit">Predicate to determine if node should be visited</param>
    /// <param name="visitFn">Function called for each visited node</param>
    public static void VisitFormStateConditional(
        this IFormStateNode node,
        Func<IFormStateNode, bool> shouldVisit,
        Action<IFormStateNode> visitFn
    )
    {
        if (!shouldVisit(node)) return;

        visitFn(node);
        foreach (var child in node.Children)
        {
            child.VisitFormStateConditional(shouldVisit, visitFn);
        }
    }

    /// <summary>
    /// Post-order traversal (children before parent).
    /// Useful for calculating sizes/dimensions from children.
    /// </summary>
    /// <param name="node">The node to start visiting from</param>
    /// <param name="visitFn">Function called for each node after its children</param>
    public static void VisitFormStatePostOrder(
        this IFormStateNode node,
        Action<IFormStateNode> visitFn
    )
    {
        foreach (var child in node.Children)
        {
            child.VisitFormStatePostOrder(visitFn);
        }
        visitFn(node);
    }

    /// <summary>
    /// Gets the display title for a form state node.
    /// </summary>
    /// <param name="node">The form state node</param>
    /// <returns>Display title string</returns>
    public static string GetTitle(this IFormStateNode node)
    {
        return node.Definition.Title
            ?? node.DataNode?.Schema.Field.DisplayName
            ?? node.DataNode?.Schema.Field.Field
            ?? "<untitled>";
    }
}
