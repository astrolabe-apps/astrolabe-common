using Astrolabe.Common.Exceptions;
using Microsoft.AspNetCore.Http;

namespace Astrolabe.Forms;

public class FormsExceptionFilter : IEndpointFilter
{
    private static readonly ISet<string> DontUseMessage = new HashSet<string> { "NotEmptyValidator" };

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        try
        {
            return await next(context);
        }
        catch (NotFoundException e)
        {
            return Results.NotFound(e.Message);
        }
        catch (ForbiddenException)
        {
            return Results.Forbid();
        }
        catch (FormsValidationException e)
        {
            var errors = e.Errors.Select(err =>
            {
                var error = new Dictionary<string, object>();
                if (err.ErrorCode != null && DontUseMessage.Contains(err.ErrorCode))
                    error.Add(err.ErrorCode, true);
                else
                    error.Add("message", err.ErrorMessage);
                return new { Path = err.PropertyName, Error = error };
            });
            return Results.BadRequest(new { Errors = errors });
        }
    }
}
