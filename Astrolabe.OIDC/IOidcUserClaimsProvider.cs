using System.Security.Claims;

namespace Astrolabe.OIDC;

/// <summary>
/// Provides OIDC claims from a user's existing LocalUsers JWT.
/// Implementations decode the JWT and return standard OIDC claims (sub, name, email, role, etc.).
/// </summary>
public interface IOidcUserClaimsProvider
{
    /// <summary>
    /// Extracts OIDC claims from the given user JWT.
    /// Returns null if the token is invalid or the user cannot be found.
    /// </summary>
    Task<IEnumerable<Claim>?> GetClaimsFromUserToken(string userJwt);
}
