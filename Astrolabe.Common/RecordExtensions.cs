using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Astrolabe.Common;

/// <summary>
/// Utility methods for working with C# records and POCOs.
/// </summary>
public static class RecordExtensions
{
    /// <summary>
    /// Clones a record or class instance and overrides specified properties from a dictionary.
    /// For records, this uses the primary constructor. For classes, it uses MemberwiseClone.
    /// </summary>
    /// <typeparam name="T">The type to clone</typeparam>
    /// <param name="original">The original instance to clone</param>
    /// <param name="overrides">Dictionary of property names to new values</param>
    /// <returns>A new instance with the overridden property values</returns>
    public static T CloneWithOverrides<T>(T original, IDictionary<string, object?> overrides)
    {
        if (original == null)
            throw new ArgumentNullException(nameof(original));
        if (overrides == null)
            throw new ArgumentNullException(nameof(overrides));

        var type = typeof(T);
        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);

        // Collect all current property values
        var allValues = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var prop in properties.Where(p => p.CanRead))
        {
            allValues[prop.Name] = prop.GetValue(original);
        }

        // Apply overrides (case-insensitive)
        foreach (var (key, value) in overrides)
        {
            allValues[key] = value;
        }

        // Try to use record copy constructor (primary constructor with all properties)
        var constructors = type.GetConstructors()
            .OrderByDescending(c => c.GetParameters().Length)
            .ToArray();

        foreach (var constructor in constructors)
        {
            var parameters = constructor.GetParameters();

            // Try to match all parameters to properties
            var args = new object?[parameters.Length];
            var allMatched = true;

            for (int i = 0; i < parameters.Length; i++)
            {
                var param = parameters[i];
                // Try to find matching property (case-insensitive)
                var propName = properties.FirstOrDefault(p =>
                    string.Equals(p.Name, param.Name, StringComparison.OrdinalIgnoreCase))?.Name;

                if (propName != null && allValues.TryGetValue(propName, out var value))
                {
                    args[i] = value;
                }
                else
                {
                    // Can't match all parameters, try next constructor
                    allMatched = false;
                    break;
                }
            }

            if (allMatched)
            {
                var instance = (T)constructor.Invoke(args);

                // Set any init-only or settable properties not covered by constructor
                foreach (var prop in properties.Where(p => p.CanWrite))
                {
                    // Check if this property was set by constructor
                    var wasSetByConstructor = parameters.Any(p =>
                        string.Equals(p.Name, prop.Name, StringComparison.OrdinalIgnoreCase));

                    if (!wasSetByConstructor && allValues.TryGetValue(prop.Name, out var value))
                    {
                        prop.SetValue(instance, value);
                    }
                }

                return instance;
            }
        }

        // Fallback: Use MemberwiseClone for classes
        var cloneMethod = type.GetMethod("MemberwiseClone",
            BindingFlags.NonPublic | BindingFlags.Instance);

        if (cloneMethod != null)
        {
            var cloned = (T)cloneMethod.Invoke(original, null)!;

            // Apply overrides to the cloned instance
            foreach (var (key, value) in overrides)
            {
                var property = properties.FirstOrDefault(p =>
                    string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase));

                if (property != null && property.CanWrite)
                {
                    property.SetValue(cloned, value);
                }
            }

            return cloned;
        }

        throw new InvalidOperationException(
            $"Unable to clone type {type.Name}. No suitable constructor or MemberwiseClone found.");
    }
}