using Astrolabe.Common.Exceptions;
using Microsoft.AspNetCore.Http;

namespace Astrolabe.Forms;

public class FormsExceptionFilter : IEndpointFilter
{
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
    }
}
