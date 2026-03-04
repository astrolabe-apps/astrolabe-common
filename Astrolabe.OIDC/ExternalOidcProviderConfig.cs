namespace Astrolabe.OIDC;

/// <summary>
/// Configuration for an external OIDC provider used for federation.
/// </summary>
public class ExternalOidcProviderConfig
{
    /// <summary>
    /// Unique name for this provider (e.g., "microsoft", "google"). Used in URLs and state tracking.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// The authority URL (issuer) of the external OIDC provider (e.g., "https://login.microsoftonline.com/{tenant}/v2.0").
    /// Used to fetch the discovery document.
    /// </summary>
    public required string Authority { get; set; }

    /// <summary>
    /// The client ID registered with the external provider.
    /// </summary>
    public required string ClientId { get; set; }

    /// <summary>
    /// The client secret registered with the external provider. Optional when using PKCE with a public client.
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// Scopes to request from the external provider. Default: "openid profile email".
    /// </summary>
    public string Scopes { get; set; } = "openid profile email";

    /// <summary>
    /// Display name shown to users (e.g., "Login with Microsoft").
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether to use PKCE when authenticating with the external provider. Default: true.
    /// </summary>
    public bool UsePkce { get; set; } = true;
}
