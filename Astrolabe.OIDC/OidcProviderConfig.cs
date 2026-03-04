namespace Astrolabe.OIDC;

/// <summary>
/// Configuration for the OIDC provider.
/// </summary>
public class OidcProviderConfig
{
    /// <summary>
    /// The issuer URL for the OIDC provider. Must match the base URL where OIDC endpoints are mounted.
    /// </summary>
    public required string Issuer { get; set; }

    /// <summary>
    /// RSA key configuration for signing tokens.
    /// </summary>
    public required OidcRsaKeyConfig RsaKey { get; set; }

    /// <summary>
    /// Registered OIDC clients.
    /// </summary>
    public List<OidcClientConfig> Clients { get; set; } = [];

    /// <summary>
    /// The URL of the SPA login page. The authorize endpoint will redirect here with an oidc_request_id parameter.
    /// </summary>
    public string LoginPageUrl { get; set; } = "/login";

    /// <summary>
    /// Lifetime of access tokens in seconds. Default: 3600 (1 hour).
    /// </summary>
    public int AccessTokenLifetimeSeconds { get; set; } = 3600;

    /// <summary>
    /// Lifetime of ID tokens in seconds. Default: 3600 (1 hour).
    /// </summary>
    public int IdTokenLifetimeSeconds { get; set; } = 3600;

    /// <summary>
    /// Lifetime of authorization codes in seconds. Default: 300 (5 minutes).
    /// </summary>
    public int AuthorizationCodeLifetimeSeconds { get; set; } = 300;

    /// <summary>
    /// Lifetime of refresh tokens in seconds. Default: 86400 (24 hours).
    /// </summary>
    public int RefreshTokenLifetimeSeconds { get; set; } = 86400;

    /// <summary>
    /// External OIDC providers for federation. When configured, users can authenticate via these providers.
    /// </summary>
    public List<ExternalOidcProviderConfig> ExternalProviders { get; set; } = [];
}

/// <summary>
/// RSA key configuration for token signing.
/// </summary>
public class OidcRsaKeyConfig
{
    /// <summary>
    /// RSA private key in PEM format. Takes precedence over Base64Key if both are set.
    /// </summary>
    public string? PemKey { get; set; }

    /// <summary>
    /// RSA private key as base64-encoded PKCS#8 DER bytes.
    /// </summary>
    public string? Base64Key { get; set; }

    /// <summary>
    /// Optional key ID. If not set, derived from key thumbprint.
    /// </summary>
    public string? KeyId { get; set; }
}
