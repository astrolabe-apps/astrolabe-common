using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Evaluates DataMatchExpression by checking if field value matches or contains the target value.
/// For arrays: checks if array contains the value.
/// For non-arrays: checks equality.
/// </summary>
public static class DataMatchExpressionEvaluator
{
    public static IDisposable Evaluate(
        DataMatchExpression expression,
        ExpressionEvalContext context,
        Action<object?> returnResult)
    {
        return ChangeTracker.Evaluate(
            tracker => EvaluateValue(expression, context, tracker),
            returnResult
        );
    }

    private static object? EvaluateValue(
        DataMatchExpression expression,
        ExpressionEvalContext context,
        ChangeTracker tracker)
    {
        // Resolve field path to SchemaDataNode
        var fieldNode = context.DataNode.GetChildForFieldRef(expression.Field);
        if (fieldNode == null)
            return false;

        // Get value and track access
        var fieldValue = tracker.GetValue(fieldNode.Control);

        // Array check: contains
        if (fieldValue is System.Collections.IEnumerable enumerable
            && fieldValue is not string)
        {
            foreach (var item in enumerable)
            {
                if (IControl.IsEqual(item, expression.Value))
                    return true;
            }
            return false;
        }

        // Non-array: equality check
        return IControl.IsEqual(fieldValue, expression.Value);
    }
}