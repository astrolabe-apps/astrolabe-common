using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;

namespace __ProjectName__.Exceptions;

/// <summary>
/// Global exception handler middleware that converts exceptions to appropriate HTTP responses
/// </summary>
public class ExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ExceptionHandler> _logger;

    public ExceptionHandler(ILogger<ExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        _logger.LogError(exception, "An unhandled exception occurred");

        var (statusCode, message) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, exception.Message),
            ArgumentException => (HttpStatusCode.BadRequest, exception.Message),
            InvalidOperationException => (HttpStatusCode.Conflict, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden, exception.Message),
            _ => (
                HttpStatusCode.InternalServerError,
                "An error occurred while processing your request."
            ),
        };

        httpContext.Response.StatusCode = (int)statusCode;
        httpContext.Response.ContentType = "application/json";

        var response = new { error = message, statusCode = (int)statusCode };

        await httpContext.Response.WriteAsync(
            JsonSerializer.Serialize(response),
            cancellationToken
        );

        return true;
    }
}
