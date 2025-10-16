namespace Astrolabe.Schemas.Validation;

/// <summary>
/// Delegate for validator evaluation functions.
/// Takes a validator definition and a validation context, and registers validation logic with the context.
/// </summary>
/// <typeparam name="T">The type of validator (must inherit from SchemaValidator)</typeparam>
/// <param name="validation">The validator definition</param>
/// <param name="context">The validation evaluation context</param>
public delegate void ValidatorEval<in T>(T validation, IValidationEvalContext context)
    where T : SchemaValidator;
