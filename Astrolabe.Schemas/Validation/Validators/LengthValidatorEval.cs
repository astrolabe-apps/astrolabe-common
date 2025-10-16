using Astrolabe.Controls;

namespace Astrolabe.Schemas.Validation.Validators;

/// <summary>
/// Evaluator for length validation (strings and arrays).
/// Validates minimum and maximum length constraints.
/// </summary>
public static class LengthValidatorEval
{
    /// <summary>
    /// Sets up length validation based on LengthValidator definition.
    /// Reports errors when length constraints are not met.
    /// </summary>
    /// <param name="lv">The length validator definition</param>
    /// <param name="context">The validation context</param>
    public static void Evaluate(LengthValidator lv, IValidationEvalContext context)
    {
        context.AddSync((object? value, ChangeTracker tracker) =>
        {
            var field = context.Data.Schema.Field;
            var control = context.Data.Control;
            var len = context.SchemaInterface.ControlLength(field, control);

            // Check minimum length
            if (lv.Min != null && len < lv.Min)
            {
                // Note: For collections below minimum length, auto-expansion should be handled
                // elsewhere (e.g., in the UI or a separate control behavior), not in validation.
                // Validators should only report errors, not modify data.
                return context.SchemaInterface.ValidationMessageText(
                    field,
                    ValidationMessageType.MinLength,
                    len,
                    lv.Min.Value
                );
            }

            // Check maximum length
            if (lv.Max != null && len > lv.Max)
            {
                return context.SchemaInterface.ValidationMessageText(
                    field,
                    ValidationMessageType.MaxLength,
                    len,
                    lv.Max.Value
                );
            }

            return null;
        });
    }
}
