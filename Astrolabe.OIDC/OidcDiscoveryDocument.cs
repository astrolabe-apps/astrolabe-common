using System.Text.Json.Serialization;

namespace Astrolabe.OIDC;

/// <summary>
/// OpenID Connect discovery document response.
/// </summary>
public class OidcDiscoveryDocument
{
    [JsonPropertyName("issuer")]
    public required string Issuer { get; set; }

    [JsonPropertyName("authorization_endpoint")]
    public required string AuthorizationEndpoint { get; set; }

    [JsonPropertyName("token_endpoint")]
    public required string TokenEndpoint { get; set; }

    [JsonPropertyName("jwks_uri")]
    public required string JwksUri { get; set; }

    [JsonPropertyName("end_session_endpoint")]
    public required string EndSessionEndpoint { get; set; }

    [JsonPropertyName("response_types_supported")]
    public List<string> ResponseTypesSupported { get; set; } = ["code"];

    [JsonPropertyName("subject_types_supported")]
    public List<string> SubjectTypesSupported { get; set; } = ["public"];

    [JsonPropertyName("id_token_signing_alg_values_supported")]
    public List<string> IdTokenSigningAlgValuesSupported { get; set; } = ["RS256"];

    [JsonPropertyName("scopes_supported")]
    public List<string> ScopesSupported { get; set; } = ["openid", "profile", "email", "offline_access"];

    [JsonPropertyName("token_endpoint_auth_methods_supported")]
    public List<string> TokenEndpointAuthMethodsSupported { get; set; } = ["none"];

    [JsonPropertyName("code_challenge_methods_supported")]
    public List<string> CodeChallengeMethodsSupported { get; set; } = ["S256"];

    [JsonPropertyName("grant_types_supported")]
    public List<string> GrantTypesSupported { get; set; } = ["authorization_code", "refresh_token"];
}
