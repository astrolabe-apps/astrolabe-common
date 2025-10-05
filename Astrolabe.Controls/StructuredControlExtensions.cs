using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Provides extension methods for working with structured controls (controls wrapping POCOs/records).
/// Enables type-safe field access using C# expressions.
/// </summary>
public static class StructuredControlExtensions
{
    /// <summary>
    /// Accesses a field of a structured control using a property expression.
    /// Returns a typed control for the specified field.
    /// </summary>
    /// <typeparam name="T">The type of the parent control's value</typeparam>
    /// <typeparam name="TField">The type of the field being accessed</typeparam>
    /// <param name="control">The parent structured control</param>
    /// <param name="fieldSelector">Expression selecting the field (e.g., x => x.FieldName)</param>
    /// <returns>A typed control for the specified field</returns>
    /// <exception cref="InvalidOperationException">Thrown if the field is not found</exception>
    /// <exception cref="ArgumentException">Thrown if the expression is not a simple property access</exception>
    /// <example>
    /// <code>
    /// record MyData(string Name, int Age);
    /// var control = Control.CreateStructured(new MyData("John", 30));
    /// var nameControl = control.Field(x => x.Name); // ITypedControl&lt;string&gt;
    /// var ageControl = control.Field(x => x.Age);   // ITypedControl&lt;int&gt;
    /// </code>
    /// </example>
    public static ITypedControl<TField> Field<T, TField>(
        this ITypedControl<T> control,
        Expression<Func<T, TField>> fieldSelector)
    {
        var propertyName = GetPropertyName(fieldSelector);
        var childControl = control.UnderlyingControl[propertyName];

        if (childControl == null)
        {
            throw new InvalidOperationException(
                $"Field '{propertyName}' not found on control of type {typeof(T).Name}. " +
                $"Ensure the control was created with CreateStructured and contains this field."
            );
        }

        return childControl.AsTyped<TField>();
    }

    /// <summary>
    /// Extracts the property name from a property access expression.
    /// </summary>
    private static string GetPropertyName<T, TField>(Expression<Func<T, TField>> expression)
    {
        return expression.Body switch
        {
            // Direct property access: x => x.Property
            MemberExpression memberExpr => memberExpr.Member.Name,

            // Nullable value types: x => x.NullableProperty (may have Convert)
            UnaryExpression { Operand: MemberExpression memberExpr2 } => memberExpr2.Member.Name,

            _ => throw new ArgumentException(
                "Expression must be a simple property access (e.g., x => x.PropertyName). " +
                "Complex expressions are not supported.",
                nameof(expression))
        };
    }
}
