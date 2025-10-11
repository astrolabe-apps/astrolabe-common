using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Represents a reactive wrapper around an object of type T, providing expression-based access to properties
/// and their associated controls.
/// </summary>
/// <typeparam name="T">The type of the underlying object.</typeparam>
public interface IReactive<T>
{
    /// <summary>
    /// Gets a value from the underlying object using an expression selector.
    /// Supports nested property access (e.g., x => x.Address.City).
    /// </summary>
    /// <typeparam name="T2">The type of the property being accessed.</typeparam>
    /// <param name="selector">An expression that selects the property to access.</param>
    /// <returns>The value of the selected property.</returns>
    T2 Get<T2>(Expression<Func<T, T2>> selector);

    /// <summary>
    /// Gets a reactive wrapper for a nested object. Use this when navigating to nested POCOs.
    /// The reactive wrapper will be cached and reused for the same property path.
    /// Only supports single-level property access (e.g., x => x.Address).
    /// </summary>
    /// <typeparam name="T2">The type of the nested object.</typeparam>
    /// <param name="selector">An expression that selects the nested object. Must be a single-level property access.</param>
    /// <returns>A reactive wrapper around the nested object.</returns>
    /// <exception cref="ArgumentException">Thrown if the selector contains nested property access.</exception>
    IReactive<T2> GetReactive<T2>(Expression<Func<T, T2>> selector);

    /// <summary>
    /// Lazily creates or retrieves a cached control for the given property selector.
    /// Use this for UI binding to a property.
    /// Only supports single-level property access (e.g., x => x.Name).
    /// For nested properties, use GetReactive first to navigate, then GetControl.
    /// </summary>
    /// <typeparam name="T2">The type of the property.</typeparam>
    /// <param name="selector">An expression that selects the property. Must be a single-level property access.</param>
    /// <returns>The control associated with the selected property.</returns>
    /// <exception cref="ArgumentException">Thrown if the selector contains nested property access.</exception>
    IControl GetControl<T2>(Expression<Func<T, T2>> selector);

    /// <summary>
    /// Checks if a control has already been created for the given property selector.
    /// Only supports single-level property access (e.g., x => x.Name).
    /// </summary>
    /// <typeparam name="T2">The type of the property.</typeparam>
    /// <param name="selector">An expression that selects the property. Must be a single-level property access.</param>
    /// <returns>True if a control exists for the property; otherwise, false.</returns>
    /// <exception cref="ArgumentException">Thrown if the selector contains nested property access.</exception>
    bool HaveControl<T2>(Expression<Func<T, T2>> selector);
}
