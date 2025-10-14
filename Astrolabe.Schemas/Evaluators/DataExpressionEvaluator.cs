using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Evaluates DataExpression by returning the value of the referenced field.
/// Tracks the field control's value for reactive updates.
/// </summary>
public static class DataExpressionEvaluator
{
    public static IDisposable Evaluate(
        DataExpression expression,
        ExpressionEvalContext context,
        Action<object?> returnResult)
    {
        return ChangeTracker.Evaluate(
            tracker => EvaluateValue(expression, context, tracker),
            returnResult
        );
    }

    private static object? EvaluateValue(
        DataExpression expression,
        ExpressionEvalContext context,
        ChangeTracker tracker)
    {
        // Resolve field path to SchemaDataNode
        var fieldNode = context.DataNode.GetChildForFieldRef(expression.Field);
        if (fieldNode == null)
            return null;

        // Get value and track access
        return tracker.GetValue(fieldNode.Control);
    }
}