using System.Security.Cryptography;
using System.Text;

namespace Astrolabe.LocalUsers.Oidc;

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

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
