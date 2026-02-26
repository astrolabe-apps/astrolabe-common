namespace Astrolabe.LocalUsers.Oidc;

/// <summary>
/// Represents a pending authorize request preserved across the SPA redirect.
/// </summary>
public class AuthorizeRequest
{
    public required string ClientId { get; set; }
    public required string RedirectUri { get; set; }
    public required string ResponseType { get; set; }
    public required string Scope { get; set; }
    public required string State { get; set; }
    public string? Nonce { get; set; }
    public required string CodeChallenge { get; set; }
    public required string CodeChallengeMethod { get; set; }
    public required DateTimeOffset ExpiresAt { get; set; }
}
