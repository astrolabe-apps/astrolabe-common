using Astrolabe.Schemas.Validation.Validators;

namespace Astrolabe.Schemas.Validation;

/// <summary>
/// Registry of validator evaluators by validator type.
/// Allows lookup and registration of custom validators.
/// Mirrors the pattern of ReactiveExpressionEvaluators.
/// </summary>
public static class ValidatorRegistry
{
    private static readonly Dictionary<string, ValidatorEval<SchemaValidator>>
        _evaluators = new();

    static ValidatorRegistry()
    {
        // Register default validators (JSONata deferred to v1.1)
        Register<LengthValidator>(
            ValidatorType.Length.ToString(),
            LengthValidatorEval.Evaluate);
        Register<DateValidator>(
            ValidatorType.Date.ToString(),
            DateValidatorEval.Evaluate);
        // Note: JsonataValidator registration commented out - will be added in v1.1
        // Register<JsonataValidator>(
        //     ValidatorType.Jsonata.ToString(),
        //     JsonataValidatorEval.Evaluate);
    }

    /// <summary>
    /// Registers an evaluator for a specific validator type.
    /// </summary>
    /// <typeparam name="T">The validator type</typeparam>
    /// <param name="type">The validator type string</param>
    /// <param name="eval">The evaluator function</param>
    public static void Register<T>(string type, ValidatorEval<T> eval)
        where T : SchemaValidator
    {
        _evaluators[type] = (v, ctx) => eval((T)v, ctx);
    }

    /// <summary>
    /// Gets an evaluator for the specified validator type.
    /// </summary>
    /// <param name="type">The validator type string</param>
    /// <returns>The evaluator, or null if not registered</returns>
    public static ValidatorEval<SchemaValidator>? Get(string type)
    {
        return _evaluators.TryGetValue(type, out var eval) ? eval : null;
    }
}
