using System.Security.Claims;

namespace Astrolabe.OIDC;

/// <summary>
/// Links external OIDC identities to local user accounts.
/// Implementations should create or find a local user based on the external claims
/// and return the OIDC claims to include in the issued tokens.
/// </summary>
public interface IExternalUserLinker
{
    /// <summary>
    /// Links an external identity to a local user account.
    /// </summary>
    /// <param name="providerName">The name of the external provider (e.g., "microsoft").</param>
    /// <param name="externalClaims">Claims from the external provider's id_token.</param>
    /// <returns>
    /// Local OIDC claims for the user (sub, name, email, etc.), or null to deny access.
    /// </returns>
    Task<IEnumerable<Claim>?> LinkExternalUser(string providerName, IEnumerable<Claim> externalClaims);
}
