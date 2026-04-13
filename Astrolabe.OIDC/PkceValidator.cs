using System.Security.Cryptography;
using System.Text;

namespace Astrolabe.OIDC;

/// <summary>
/// Static utility for PKCE (Proof Key for Code Exchange) S256 validation.
/// </summary>
public static class PkceValidator
{
    /// <summary>
    /// Validates a PKCE code verifier against the stored code challenge using the S256 method.
    /// </summary>
    public static bool Validate(string codeVerifier, string codeChallenge, string codeChallengeMethod)
    {
        if (codeChallengeMethod != "S256")
            return false;

        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        var computed = Base64UrlEncode(hash);
        return string.Equals(computed, codeChallenge, StringComparison.Ordinal);
    }

    /// <summary>
    /// Generates a PKCE code verifier and its S256 challenge.
    /// </summary>
    public static (string CodeVerifier, string CodeChallenge) GenerateS256Pkce()
    {
        var verifier = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var challenge = ComputeS256Challenge(verifier);
        return (verifier, challenge);
    }

    /// <summary>
    /// Computes the S256 code challenge for a given code verifier.
    /// </summary>
    public static string ComputeS256Challenge(string codeVerifier)
    {
        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncode(hash);
    }

    internal static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
