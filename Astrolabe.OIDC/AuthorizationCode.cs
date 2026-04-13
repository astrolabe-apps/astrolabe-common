using System.Security.Claims;

namespace Astrolabe.OIDC;

/// <summary>
/// Represents a stored authorization code with associated PKCE challenge and user claims.
/// </summary>
public class AuthorizationCode
{
    public required string Code { get; set; }
    public required string ClientId { get; set; }
    public required string RedirectUri { get; set; }
    public required string CodeChallenge { get; set; }
    public required string CodeChallengeMethod { get; set; }
    public required IEnumerable<Claim> Claims { get; set; }
    public required string Scope { get; set; }
    public string? Nonce { get; set; }
    public required DateTimeOffset ExpiresAt { get; set; }
}
