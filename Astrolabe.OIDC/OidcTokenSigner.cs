using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Astrolabe.OIDC;

/// <summary>
/// Handles RSA key loading, JWT signing for id_tokens and access_tokens, and JWKS export.
/// </summary>
public class OidcTokenSigner
{
    private readonly RSA _rsa;
    private readonly RsaSecurityKey _securityKey;
    private readonly SigningCredentials _signingCredentials;
    private readonly string _keyId;
    private readonly OidcProviderConfig _config;

    public OidcTokenSigner(OidcProviderConfig config)
    {
        _config = config;
        _rsa = RSA.Create();

        if (!string.IsNullOrEmpty(config.RsaKey.PemKey))
        {
            _rsa.ImportFromPem(config.RsaKey.PemKey);
        }
        else if (!string.IsNullOrEmpty(config.RsaKey.Base64Key))
        {
            _rsa.ImportPkcs8PrivateKey(Convert.FromBase64String(config.RsaKey.Base64Key), out _);
        }
        else
        {
            throw new InvalidOperationException("Either PemKey or Base64Key must be provided in OidcRsaKeyConfig.");
        }

        _securityKey = new RsaSecurityKey(_rsa);

        _keyId = config.RsaKey.KeyId ?? ComputeKeyThumbprint(_securityKey);
        _securityKey.KeyId = _keyId;

        _signingCredentials = new SigningCredentials(_securityKey, SecurityAlgorithms.RsaSha256);
    }

    public RsaSecurityKey GetSecurityKey() => _securityKey;

    public TokenValidationParameters GetTokenValidationParameters() => new()
    {
        IssuerSigningKey = _securityKey,
        ValidateIssuerSigningKey = true,
        ValidIssuer = _config.Issuer,
        ValidateIssuer = true,
        ValidAudiences = _config.Clients.Select(c => c.ClientId).ToList(),
        ValidateAudience = true,
        ValidateLifetime = true
    };

    public string CreateIdToken(IEnumerable<Claim> claims, string audience, string? nonce)
    {
        var allClaims = new List<Claim>(claims);
        if (nonce != null)
        {
            allClaims.Add(new Claim("nonce", nonce));
        }

        var now = DateTime.UtcNow;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _config.Issuer,
            Audience = audience,
            Subject = new ClaimsIdentity(allClaims),
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddSeconds(_config.IdTokenLifetimeSeconds),
            SigningCredentials = _signingCredentials
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.CreateEncodedJwt(descriptor);
    }

    public string CreateAccessToken(IEnumerable<Claim> claims, string audience, string scope)
    {
        var allClaims = new List<Claim>(claims);
        if (!string.IsNullOrEmpty(scope))
        {
            allClaims.Add(new Claim("scope", scope));
        }

        var now = DateTime.UtcNow;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _config.Issuer,
            Audience = audience,
            Subject = new ClaimsIdentity(allClaims),
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddSeconds(_config.AccessTokenLifetimeSeconds),
            SigningCredentials = _signingCredentials
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.CreateEncodedJwt(descriptor);
    }

    public JwksDocument GetJwksDocument()
    {
        var parameters = _rsa.ExportParameters(includePrivateParameters: false);

        return new JwksDocument
        {
            Keys =
            [
                new JsonWebKeyData
                {
                    Kty = "RSA",
                    Kid = _keyId,
                    N = Base64UrlEncode(parameters.Modulus!),
                    E = Base64UrlEncode(parameters.Exponent!)
                }
            ]
        };
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string ComputeKeyThumbprint(RsaSecurityKey key)
    {
        var parameters = key.Rsa.ExportParameters(includePrivateParameters: false);
        var thumbprintInput = parameters.Modulus!.Concat(parameters.Exponent!).ToArray();
        var hash = SHA256.HashData(thumbprintInput);
        return Base64UrlEncode(hash)[..16];
    }
}
