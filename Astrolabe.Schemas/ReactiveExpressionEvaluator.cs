using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Context for evaluating entity expressions reactively.
/// Contains the schema data node (with control and schema) and schema interface.
/// </summary>
public record ExpressionEvalContext(
    /// <summary>
    /// The schema data node containing both the control and schema information.
    /// Field paths are resolved relative to this node.
    /// </summary>
    SchemaDataNode DataNode,

    /// <summary>
    /// Schema interface for type-aware operations like isEmpty checks.
    /// Required for NotEmptyExpression and other schema-aware evaluations.
    /// </summary>
    ISchemaInterface SchemaInterface
);

/// <summary>
/// Delegate for setting up reactive evaluation of an EntityExpression.
/// The evaluator creates a ChangeTracker, evaluates the expression, and returns a disposable.
/// </summary>
/// <typeparam name="T">The type of expression being evaluated</typeparam>
/// <param name="expression">The expression to evaluate</param>
/// <param name="context">Evaluation context with data node and schema interface</param>
/// <param name="returnResult">Callback to return evaluation results (called initially and on changes)</param>
/// <returns>IDisposable (the ChangeTracker) to clean up subscriptions</returns>
public delegate IDisposable ExpressionEvaluator<in T>(
    T expression,
    ExpressionEvalContext context,
    Action<object?> returnResult
) where T : EntityExpression;

/// <summary>
/// Registry of expression evaluators by expression type.
/// Allows lookup and registration of custom evaluators.
/// </summary>
public static class ReactiveExpressionEvaluators
{
    private static readonly Dictionary<string, ExpressionEvaluator<EntityExpression>>
        _evaluators = new();

    static ReactiveExpressionEvaluators()
    {
        // Register default evaluators
        Register<DataExpression>(nameof(ExpressionType.Data), DataExpressionEvaluator.Evaluate);
        Register<DataMatchExpression>(nameof(ExpressionType.FieldValue), DataMatchExpressionEvaluator.Evaluate);
        Register<NotEmptyExpression>(nameof(ExpressionType.NotEmpty), NotEmptyExpressionEvaluator.Evaluate);
        Register<EntityExpression>(nameof(ExpressionType.UUID), UuidExpressionEvaluator.Evaluate);
    }

    /// <summary>
    /// Registers an evaluator for a specific expression type.
    /// </summary>
    public static void Register<T>(string expressionType, ExpressionEvaluator<T> evaluator)
        where T : EntityExpression
    {
        _evaluators[expressionType] = (expr, ctx, returnResult) =>
            evaluator((T)expr, ctx, returnResult);
    }

    /// <summary>
    /// Gets an evaluator for the specified expression type.
    /// </summary>
    public static ExpressionEvaluator<EntityExpression>? GetEvaluator(string expressionType)
    {
        return _evaluators.TryGetValue(expressionType, out var evaluator) ? evaluator : null;
    }

    /// <summary>
    /// Evaluates an expression using the registered evaluator.
    /// </summary>
    public static IDisposable Evaluate(
        EntityExpression expression,
        ExpressionEvalContext context,
        Action<object?> returnResult)
    {
        var evaluator = GetEvaluator(expression.Type);
        if (evaluator == null)
            throw new InvalidOperationException(
                $"No evaluator registered for expression type: {expression.Type}");

        return evaluator(expression, context, returnResult);
    }
}

/// <summary>
/// Extension methods for setting up reactive expression evaluation on controls.
/// </summary>
public static class ReactiveExpressionExtensions
{
    /// <summary>
    /// Sets up reactive evaluation of an EntityExpression on a target control.
    /// The control's value will automatically update when expression dependencies change.
    /// Returns an IDisposable that should be disposed to stop the reactive evaluation.
    /// </summary>
    /// <param name="targetControl">The control to update with expression results</param>
    /// <param name="expression">The expression to evaluate (null returns null)</param>
    /// <param name="context">Evaluation context with data node and schema interface</param>
    /// <param name="editor">ControlEditor for applying updates to the target control</param>
    /// <param name="coerce">Optional function to coerce/transform the result value</param>
    /// <returns>IDisposable for cleanup, or null if expression was null</returns>
    public static IDisposable SetupReactiveExpression(
        this IControl targetControl,
        EntityExpression expression,
        ExpressionEvalContext context,
        ControlEditor editor,
        Func<object?, object?>? coerce = null)
    {
        // Unwrap NotExpression at this level so it works with any evaluator
        var actualExpr = expression;
        var actualCoerce = coerce;
        while (actualExpr is NotExpression notExpr)
        {
            var prevCoerce = actualCoerce;
            actualCoerce = prevCoerce != null
                ? r => prevCoerce(Negate(r))
                : Negate;
            actualExpr = notExpr.InnerExpression;
        }

        // Evaluate expression with callback that updates the target control
        return ReactiveExpressionEvaluators.Evaluate(
            actualExpr,
            context,
            result =>
            {
                // Apply optional coercion
                var finalResult = actualCoerce != null ? actualCoerce(result) : result;

                // Update the target control with the result
                editor.SetValue(targetControl, finalResult);
            }
        );
    }

    private static object? Negate(object? value)
    {
        return value is bool b ? !b : value;
    }
}