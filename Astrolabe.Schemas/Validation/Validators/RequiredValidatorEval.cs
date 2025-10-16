using Astrolabe.Controls;

namespace Astrolabe.Schemas.Validation.Validators;

/// <summary>
/// Evaluator for required field validation.
/// Checks if a field has a non-empty value when marked as required.
/// </summary>
public static class RequiredValidatorEval
{
    /// <summary>
    /// Sets up required field validation based on DataControlDefinition.Required property.
    /// </summary>
    /// <param name="def">The data control definition</param>
    /// <param name="context">The validation context</param>
    public static void Evaluate(DataControlDefinition def, IValidationEvalContext context)
    {
        if (def.Required != true) return;

        context.AddSync((value, tracker) =>
        {
            var field = context.Data.Schema.Field;
            var isEmpty = context.SchemaInterface.IsEmptyValue(field, value);

            if (isEmpty)
            {
                // Use custom error text if provided, otherwise generate standard message
                return !string.IsNullOrEmpty(def.RequiredErrorText)
                    ? def.RequiredErrorText
                    : context.SchemaInterface.ValidationMessageText(
                        field,
                        ValidationMessageType.NotEmpty,
                        false,
                        true
                    );
            }

            return null;
        });
    }
}
