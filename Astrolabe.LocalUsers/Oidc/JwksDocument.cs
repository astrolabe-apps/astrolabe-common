using System.Text.Json.Serialization;

namespace Astrolabe.LocalUsers.Oidc;

/// <summary>
/// JSON Web Key Set document response.
/// </summary>
public class JwksDocument
{
    [JsonPropertyName("keys")]
    public required List<JsonWebKeyData> Keys { get; set; }
}

/// <summary>
/// A single JSON Web Key entry in the JWKS document.
/// </summary>
public class JsonWebKeyData
{
    [JsonPropertyName("kty")]
    public required string Kty { get; set; }

    [JsonPropertyName("use")]
    public string Use { get; set; } = "sig";

    [JsonPropertyName("kid")]
    public required string Kid { get; set; }

    [JsonPropertyName("alg")]
    public string Alg { get; set; } = "RS256";

    [JsonPropertyName("n")]
    public required string N { get; set; }

    [JsonPropertyName("e")]
    public required string E { get; set; }
}
