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

    /// <summary>
    /// Whether to validate the issuer claim in tokens from this provider. Default: true.
    /// Set to false for multi-tenant providers (e.g., Azure AD "common" endpoint) where
    /// the discovery document issuer contains placeholders that don't match actual token issuers.
    /// </summary>
    public bool ValidateIssuer { get; set; } = true;

    /// <summary>
    /// Whether the provider's own logout endpoint should be called when a user who logged in
    /// via this provider hits the end session endpoint. Default: true.
    /// Requires the provider's discovery document to publish an end_session_endpoint;
    /// when it doesn't, logout falls back to a purely local logout.
    /// </summary>
    public bool EnableRpInitiatedLogout { get; set; } = true;

    /// <summary>
    /// Extra query parameters to append to the provider's logout URL (e.g. Azure AD's "logout_hint").
    /// </summary>
    public Dictionary<string, string> AdditionalLogoutParams { get; set; } = [];

    /// <summary>
    /// Lifetime of external auth state in seconds for this provider, i.e. how long a user has to
    /// complete login at this provider before the callback is rejected. When not set, falls back
    /// to <see cref="OidcProviderConfig.ExternalAuthStateLifetimeSeconds"/>.
    /// </summary>
    public int? AuthStateLifetimeSeconds { get; set; }
}
