namespace Astrolabe.FormDesigner;

public record FormsValidationError(string PropertyName, string ErrorMessage, string? ErrorCode = null);

public class FormsValidationException(IEnumerable<FormsValidationError> errors) : Exception("Validation failed")
{
    public IEnumerable<FormsValidationError> Errors { get; } = errors;
}
