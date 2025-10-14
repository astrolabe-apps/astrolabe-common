# C# Reactive Expression Evaluator Design

## Overview

This document describes the design for a reactive expression evaluator system in C# that mirrors the TypeScript `evalExpression.ts` implementation. The system allows `EntityExpression` objects to be evaluated reactively, automatically re-evaluating when their dependencies change.

## Key Design Principles

1. **Explicit Dependency Tracking**: C# requires explicit use of `tracker.GetValue()` to track control value dependencies.
2. **Reactive Computation**: Uses `ChangeTracker.Evaluate()` pattern for automatic re-evaluation on dependency changes.
3. **Extensible Evaluators**: Registry-based system allowing custom evaluators for different expression types.
4. **Schema-Driven**: Uses `SchemaDataNode` for field path resolution with integrated schema information.

## Core Types

### ChangeTracker Helper Methods

Helper methods to be added to `ChangeTracker` for reactive evaluation:

```csharp
namespace Astrolabe.Controls;

public partial class ChangeTracker
{
    /// <summary>
    /// Gets the value of a control and records access for reactive tracking.
    /// Combines RecordAccess and Value access in one convenient method.
    /// </summary>
    /// <param name="control">The control to get the value from</param>
    /// <returns>The current value of the control</returns>
    public object? GetValue(IControl control)
    {
        RecordAccess(control, ControlChange.Value);
        return control.Value;
    }

    /// <summary>
    /// Sets up reactive evaluation with automatic re-evaluation on dependency changes.
    /// Creates a ChangeTracker, sets up the callback, performs initial evaluation, and returns the tracker.
    /// </summary>
    /// <typeparam name="T">The type of result being computed</typeparam>
    /// <param name="evaluate">Function that evaluates the result and tracks dependencies</param>
    /// <param name="returnResult">Callback to return results (called initially and on changes)</param>
    /// <returns>The ChangeTracker as IDisposable for cleanup</returns>
    public static IDisposable Evaluate<T>(
        Func<ChangeTracker, T> evaluate,
        Action<T> returnResult)
    {
        var tracker = new ChangeTracker();

        // Set up callback for when dependencies change
        tracker.SetCallback(() =>
        {
            var result = evaluate(tracker);
            returnResult(result);
            tracker.UpdateSubscriptions();
        });

        // Initial evaluation
        var initialResult = evaluate(tracker);
        returnResult(initialResult);
        tracker.UpdateSubscriptions();

        return tracker;
    }
}
```

### ExpressionEvalContext

The context passed to all evaluators containing the data node and schema interface.

```csharp
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
```

### ExpressionEvaluator Delegate

Evaluators create a ChangeTracker, set up reactive subscriptions, and return a disposable for cleanup.

```csharp
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
```

### ISchemaInterface

Interface for type-aware schema operations (used by NotEmptyExpression).

```csharp
/// <summary>
/// Interface for schema-aware operations on field values.
/// Mirrors the TypeScript SchemaInterface (subset of methods needed for expression evaluation).
/// </summary>
public interface ISchemaInterface
{
    /// <summary>
    /// Determines if a value is considered empty for a given field.
    /// </summary>
    /// <param name="field">The schema field definition</param>
    /// <param name="value">The value to check</param>
    /// <returns>True if the value is considered empty</returns>
    bool IsEmptyValue(SchemaField field, object? value);
}
```

## Individual Evaluators

### DataExpressionEvaluator

Evaluates `DataExpression` by resolving a field path and tracking its value.

```csharp
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
```

### DataMatchExpressionEvaluator

Evaluates `DataMatchExpression` by checking if a field's value matches the specified value.

```csharp
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
```

### NotEmptyExpressionEvaluator

Evaluates `NotEmptyExpression` using schema-aware empty checks.

```csharp
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

        // Use schema interface to determine if empty
        bool isEmpty = context.SchemaInterface.IsEmptyValue(field, fieldValue);

        // Return based on whether we're checking for empty or not-empty
        bool expectEmpty = expression.Empty ?? false;
        return isEmpty == expectEmpty;
    }
}
```

### UuidExpressionEvaluator

Non-reactive evaluator that generates a new GUID.

```csharp
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
```

## Evaluator Registry

Central registry for mapping expression types to evaluators.

```csharp
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
        Register(nameof(ExpressionType.Data), DataExpressionEvaluator.Evaluate);
        Register(nameof(ExpressionType.FieldValue), DataMatchExpressionEvaluator.Evaluate);
        Register(nameof(ExpressionType.NotEmpty), NotEmptyExpressionEvaluator.Evaluate);
        Register(nameof(ExpressionType.UUID), UuidExpressionEvaluator.Evaluate);
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
```

## Extension Method for Easy Setup

Convenience extension method for setting up reactive expression evaluation on controls.

```csharp
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
    public static IDisposable? SetupReactiveExpression(
        this IControl targetControl,
        EntityExpression? expression,
        ExpressionEvalContext context,
        ControlEditor editor,
        Func<object?, object?>? coerce = null)
    {
        if (expression == null)
            return null;

        // Evaluate expression with callback that updates the target control
        return ReactiveExpressionEvaluators.Evaluate(
            expression,
            context,
            result =>
            {
                // Apply optional coercion
                var finalResult = coerce != null ? coerce(result) : result;

                // Update the target control with the result
                editor.SetValue(targetControl, finalResult);
            }
        );
    }
}
```

## Usage Examples

### Example 1: Basic DataExpression

```csharp
// Setup: Create schema and data
var schema = /* your schema definition */;
var dataControl = Control.Create(new { firstName = "John", lastName = "Doe" });
var schemaDataNode = new SchemaDataNode(schema, dataControl);
var schemaInterface = new MySchemaInterface();

// Create expression to read firstName field
var expression = new DataExpression("firstName");

// Target control for result
var resultControl = Control.Create<object?>(null);

var editor = new ControlEditor();
var context = new ExpressionEvalContext(schemaDataNode, schemaInterface);

// Setup reactive evaluation - returns IDisposable for cleanup
var subscription = resultControl.SetupReactiveExpression(expression, context, editor);

Console.WriteLine(resultControl.Value); // "John"

// Change firstName - resultControl automatically updates
editor.SetValue(dataControl["firstName"], "Jane");
Console.WriteLine(resultControl.Value); // "Jane"

// Clean up when done
subscription?.Dispose();
```

### Example 2: DataMatchExpression for Visibility

```csharp
// Setup: form with user role
var schema = /* your schema definition */;
var formData = Control.Create(new { userRole = "admin", userName = "John" });
var schemaDataNode = new SchemaDataNode(schema, formData);
var schemaInterface = new MySchemaInterface();

// Expression: show field only if userRole is "admin"
var visibilityExpression = new DataMatchExpression("userRole", "admin");

// Visibility control
var isVisible = Control.Create<object?>(false);

var editor = new ControlEditor();
var context = new ExpressionEvalContext(schemaDataNode, schemaInterface);

// Setup reactive visibility with coercion to bool
var subscription = isVisible.SetupReactiveExpression(
    visibilityExpression,
    context,
    editor,
    coerce: result => (bool?)result ?? false);

Console.WriteLine(isVisible.Value); // true

// Change role - visibility updates
editor.SetValue(formData["userRole"], "user");
Console.WriteLine(isVisible.Value); // false

// Clean up when done
subscription?.Dispose();
```

### Example 3: NotEmptyExpression with Schema

```csharp
// Mock schema interface
class SimpleSchemaInterface : ISchemaInterface
{
    public bool IsEmptyValue(SchemaField field, object? value)
    {
        return value == null ||
               (value is string s && string.IsNullOrWhiteSpace(s)) ||
               (value is System.Collections.ICollection c && c.Count == 0);
    }
}

// Setup
var schema = /* your schema definition */;
var formData = Control.Create(new { email = "", name = "John" });
var schemaDataNode = new SchemaDataNode(schema, formData);
var schemaInterface = new SimpleSchemaInterface();

var expression = new NotEmptyExpression("email", Empty: false);
var isValid = Control.Create<object?>(false);

var editor = new ControlEditor();
var context = new ExpressionEvalContext(schemaDataNode, schemaInterface);

var subscription = isValid.SetupReactiveExpression(expression, context, editor);

Console.WriteLine(isValid.Value); // false (email is empty)

editor.SetValue(formData["email"], "john@example.com");
Console.WriteLine(isValid.Value); // true (email is not empty)

// Clean up when done
subscription?.Dispose();
```

### Example 4: UUID Expression (Non-Reactive)

```csharp
var schema = /* your schema definition */;
var dataControl = Control.Create<object?>(null);
var schemaDataNode = new SchemaDataNode(schema, dataControl);
var schemaInterface = new MySchemaInterface();

var expression = new SimpleExpression(nameof(ExpressionType.UUID));
var idControl = Control.Create<object?>(null);

var editor = new ControlEditor();
var context = new ExpressionEvalContext(schemaDataNode, schemaInterface);

var subscription = idControl.SetupReactiveExpression(expression, context, editor);

Console.WriteLine(idControl.Value); // "a1b2c3d4-..." (a GUID)
// Value doesn't change when dependencies change (non-reactive)

// Clean up when done
subscription?.Dispose();
```

## Comparison with TypeScript

| TypeScript | C# |
|------------|-----|
| `createSyncEffect(() => {...}, scope)` | `ChangeTracker.Evaluate(tracker => {...}, result => {...})` |
| `trackedValue(control, collectUsage)` | `tracker.GetValue(control)` |
| `returnResult(value)` | `returnResult(value)` callback parameter |
| `schemaDataForFieldRef(field, node)` | `context.DataNode.GetChildForFieldRef(field)` |
| Automatic cleanup with `scope` | Automatic cleanup via returned `IDisposable` |

## Implementation Notes

1. **Thread Safety**: Not addressed in this design. ControlEditor operations should be called from a single thread.

2. **Performance**: ChangeTracker only subscribes to controls that are accessed during evaluation, minimizing overhead.

3. **Lifecycle**: The ChangeTracker is managed by the computed control and disposed when the control is no longer needed.

4. **Extensibility**: Custom evaluators can be registered via `ReactiveExpressionEvaluators.Register<T>()`.

5. **Error Handling**: Evaluators throw exceptions for invalid configurations (e.g., missing SchemaInterface). These should be caught at the setup level.

6. **Coercion**: The `coerce` parameter allows type conversion (e.g., `object? -> bool` for visibility flags).

## File Structure

Recommended file organization:

```
Astrolabe.Schemas/
├── EntityExpression.cs                    (existing)
├── ISchemaInterface.cs                    (new - interface for schema operations)
├── ReactiveExpressionEvaluator.cs         (new - main types & registry)
└── Evaluators/
    ├── DataExpressionEvaluator.cs
    ├── DataMatchExpressionEvaluator.cs
    ├── NotEmptyExpressionEvaluator.cs
    └── UuidExpressionEvaluator.cs
```

And in `Astrolabe.Controls`:
```
Astrolabe.Controls/
└── ChangeTracker.cs                       (add GetValue and Evaluate methods)
```

Or everything in a single file if preferred for smaller codebases.