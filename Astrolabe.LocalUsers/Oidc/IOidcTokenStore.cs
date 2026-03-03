namespace Astrolabe.LocalUsers.Oidc;

/// <summary>
/// Abstract store for authorization codes, refresh tokens, and authorize requests.
/// </summary>
public interface IOidcTokenStore
{
    Task StoreAuthorizationCode(AuthorizationCode code);
    Task<AuthorizationCode?> GetAndRemoveAuthorizationCode(string code);

    Task StoreRefreshToken(RefreshToken token);
    Task<RefreshToken?> GetRefreshToken(string token);
    Task RemoveRefreshToken(string token);
    Task ReplaceRefreshToken(string oldToken, RefreshToken newToken);

    Task StoreAuthorizeRequest(string requestId, AuthorizeRequest request);
    Task<AuthorizeRequest?> GetAndRemoveAuthorizeRequest(string requestId);
}
