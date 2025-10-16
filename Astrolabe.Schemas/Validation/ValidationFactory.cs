using Astrolabe.Schemas.Validation.Validators;

namespace Astrolabe.Schemas.Validation;

/// <summary>
/// Factory for creating validators from control definitions.
/// Handles both required field validation and explicit validators.
/// </summary>
public static class ValidationFactory
{
    /// <summary>
    /// Creates all validators for a control definition and registers them with the context.
    /// </summary>
    /// <param name="def">The control definition</param>
    /// <param name="context">The validation context</param>
    public static void CreateValidators(
        ControlDefinition def,
        IValidationEvalContext context)
    {
        if (def is not DataControlDefinition dcd) return;

        // Add required validator if field is marked as required
        RequiredValidatorEval.Evaluate(dcd, context);

        // Add configured validators from definition
        if (dcd.Validators == null) return;

        foreach (var validator in dcd.Validators)
        {
            var evaluator = ValidatorRegistry.Get(validator.Type);
            if (evaluator != null)
            {
                evaluator.Invoke(validator, context);
            }
            // Note: Silently ignore unknown validator types (e.g., Jsonata in v1.0)
            // This allows definitions with Jsonata validators to work without errors
        }
    }
}
