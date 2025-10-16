using Astrolabe.Controls;

namespace Astrolabe.Schemas.Validation.Validators;

/// <summary>
/// Evaluator for date validation (NotBefore/NotAfter).
/// Validates that dates fall within allowed ranges.
/// </summary>
public static class DateValidatorEval
{
    /// <summary>
    /// Sets up date validation based on DateValidator definition.
    /// Supports fixed dates and dates relative to current date.
    /// </summary>
    /// <param name="dv">The date validator definition</param>
    /// <param name="context">The validation context</param>
    public static void Evaluate(DateValidator dv, IValidationEvalContext context)
    {
        var field = context.Data.Schema.Field;
        var comparisonDate = CalculateComparisonDate(dv, context.SchemaInterface, field);

        context.AddSync((value, tracker) =>
        {
            if (value == null) return null;

            var valueDate = context.SchemaInterface.ParseToMillis(field, value);
            var notAfter = dv.Comparison == DateComparison.NotAfter;

            // Check if date violates constraint
            if (notAfter ? valueDate > comparisonDate : valueDate < comparisonDate)
            {
                return context.SchemaInterface.ValidationMessageText(
                    field,
                    notAfter ? ValidationMessageType.NotAfterDate
                             : ValidationMessageType.NotBeforeDate,
                    valueDate,
                    comparisonDate
                );
            }

            return null;
        });
    }

    /// <summary>
    /// Calculates the comparison date from validator configuration.
    /// Supports fixed dates or dates relative to current date.
    /// </summary>
    private static long CalculateComparisonDate(
        DateValidator dv,
        ISchemaInterface si,
        SchemaField field)
    {
        // Use fixed date if provided
        if (dv.FixedDate != null)
            return si.ParseToMillis(field, dv.FixedDate);

        // Calculate date relative to today
        var now = DateTime.UtcNow.Date;
        var millis = new DateTimeOffset(now).ToUnixTimeMilliseconds();

        if (dv.DaysFromCurrent != null)
            millis += dv.DaysFromCurrent.Value * 86400000; // 86400000 ms per day

        return millis;
    }
}
