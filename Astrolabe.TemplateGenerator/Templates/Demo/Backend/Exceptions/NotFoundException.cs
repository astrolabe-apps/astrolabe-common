namespace __ProjectName__.Exceptions;

/// <summary>
/// Exception thrown when a requested resource is not found.
/// Returns HTTP 404 Not Found status code.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message)
        : base(message) { }

    public NotFoundException(string message, Exception innerException)
        : base(message, innerException) { }

    /// <summary>
    /// Helper method to throw NotFoundException if the value is null
    /// </summary>
    public static void ThrowIfNull<T>(T? value, string? message = null)
        where T : class
    {
        if (value == null)
        {
            throw new NotFoundException(message ?? "Resource not found.");
        }
    }
}
