using System.Security.Claims;

namespace Astrolabe.LocalUsers.Oidc;

/// <summary>
/// Represents a stored refresh token with associated user claims.
/// </summary>
public class RefreshToken
{
    public required string Token { get; set; }
    public required string ClientId { get; set; }
    public required IEnumerable<Claim> Claims { get; set; }
    public required string Scope { get; set; }
    public required DateTimeOffset ExpiresAt { get; set; }
}
