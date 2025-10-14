using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Evaluates NotEmptyExpression by checking if a field value is empty.
/// Uses SchemaInterface for type-aware empty checking.
/// </summary>
public static class NotEmptyExpressionEvaluator
{
    public static IDisposable Evaluate(
        NotEmptyExpression expression,
        ExpressionEvalContext context,
        Action<object?> returnResult)
    {
        return ChangeTracker.Evaluate(
            tracker => EvaluateValue(expression, context, tracker),
            returnResult
        );
    }

    private static object? EvaluateValue(
        NotEmptyExpression expression,
        ExpressionEvalContext context,
        ChangeTracker tracker)
    {
        // Resolve field path to SchemaDataNode
        var fieldNode = context.DataNode.GetChildForFieldRef(expression.Field);
        if (fieldNode == null)
            return false;

        // Get value and track access
        var fieldValue = tracker.GetValue(fieldNode.Control);
        var field = fieldNode.Schema.Field;

        // Treat undefined values as empty
        if (fieldValue is UndefinedValue)
            fieldValue = null;

        // Use schema interface to determine if empty
        bool isEmpty = context.SchemaInterface.IsEmptyValue(field, fieldValue);

        // Return based on whether we're checking for empty or not-empty
        bool expectEmpty = expression.Empty ?? false;
        return isEmpty == expectEmpty;
    }
}