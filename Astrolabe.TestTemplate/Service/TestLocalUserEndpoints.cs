using System.Security.Claims;
using Astrolabe.LocalUsers;
using Microsoft.AspNetCore.Http;

namespace Astrolabe.TestTemplate.Service;

public class TestUserIdProvider : ILocalUserIdProvider<Guid>
{
    public Guid GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null)
            throw new UnauthorizedAccessException("No user ID claim found.");
        return Guid.Parse(claim.Value);
    }
}

public class TestLocalUserEndpoints(
    ILocalUserIdProvider<Guid> userIdProvider,
    LocalUserEndpointOptions? options = null
) : LocalUserEndpoints<CreateAccountRequest, Guid>(userIdProvider, options);
