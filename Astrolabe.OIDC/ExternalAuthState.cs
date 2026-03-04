namespace Astrolabe.OIDC;

/// <summary>
/// State preserved across the external OIDC provider redirect.
/// </summary>
public class ExternalAuthState
{
    /// <summary>
    /// Random state value used as the key and passed to the external provider.
    /// </summary>
    public required string State { get; set; }

    /// <summary>
    /// The original OIDC authorize request ID from the client.
    /// </summary>
    public required string OidcRequestId { get; set; }

    /// <summary>
    /// Name of the external provider being used.
    /// </summary>
    public required string ProviderName { get; set; }

    /// <summary>
    /// PKCE code verifier for the outbound request to the external provider.
    /// </summary>
    public string? CodeVerifier { get; set; }

    /// <summary>
    /// Nonce sent to the external provider for id_token validation.
    /// </summary>
    public required string Nonce { get; set; }

    /// <summary>
    /// When this state expires.
    /// </summary>
    public required DateTimeOffset ExpiresAt { get; set; }
}
