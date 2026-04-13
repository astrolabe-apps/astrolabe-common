using System.Collections.Concurrent;

namespace Astrolabe.OIDC;

/// <summary>
/// Thread-safe in-memory implementation of <see cref="IOidcTokenStore"/> using ConcurrentDictionary.
/// Expired entries are lazily cleaned up on access.
/// </summary>
public class InMemoryOidcTokenStore : IOidcTokenStore
{
    private readonly ConcurrentDictionary<string, AuthorizationCode> _authCodes = new();
    private readonly ConcurrentDictionary<string, RefreshToken> _refreshTokens = new();
    private readonly ConcurrentDictionary<string, AuthorizeRequest> _authorizeRequests = new();
    private readonly ConcurrentDictionary<string, ExternalAuthState> _externalAuthStates = new();

    public Task StoreAuthorizationCode(AuthorizationCode code)
    {
        CleanupExpiredAuthCodes();
        _authCodes[code.Code] = code;
        return Task.CompletedTask;
    }

    public Task<AuthorizationCode?> GetAndRemoveAuthorizationCode(string code)
    {
        if (_authCodes.TryRemove(code, out var authCode) && authCode.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return Task.FromResult<AuthorizationCode?>(authCode);
        }
        return Task.FromResult<AuthorizationCode?>(null);
    }

    public Task StoreRefreshToken(RefreshToken token)
    {
        CleanupExpiredRefreshTokens();
        _refreshTokens[token.Token] = token;
        return Task.CompletedTask;
    }

    public Task<RefreshToken?> GetRefreshToken(string token)
    {
        if (_refreshTokens.TryGetValue(token, out var refreshToken) && refreshToken.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return Task.FromResult<RefreshToken?>(refreshToken);
        }
        return Task.FromResult<RefreshToken?>(null);
    }

    public Task RemoveRefreshToken(string token)
    {
        _refreshTokens.TryRemove(token, out _);
        return Task.CompletedTask;
    }

    public Task ReplaceRefreshToken(string oldToken, RefreshToken newToken)
    {
        _refreshTokens.TryRemove(oldToken, out _);
        _refreshTokens[newToken.Token] = newToken;
        return Task.CompletedTask;
    }

    public Task StoreAuthorizeRequest(string requestId, AuthorizeRequest request)
    {
        CleanupExpiredAuthorizeRequests();
        _authorizeRequests[requestId] = request;
        return Task.CompletedTask;
    }

    public Task<AuthorizeRequest?> GetAndRemoveAuthorizeRequest(string requestId)
    {
        if (_authorizeRequests.TryRemove(requestId, out var request) && request.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return Task.FromResult<AuthorizeRequest?>(request);
        }
        return Task.FromResult<AuthorizeRequest?>(null);
    }

    public Task<AuthorizeRequest?> GetAuthorizeRequest(string requestId)
    {
        if (_authorizeRequests.TryGetValue(requestId, out var request) && request.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return Task.FromResult<AuthorizeRequest?>(request);
        }
        return Task.FromResult<AuthorizeRequest?>(null);
    }

    public Task StoreExternalAuthState(ExternalAuthState state)
    {
        CleanupExpiredExternalAuthStates();
        _externalAuthStates[state.State] = state;
        return Task.CompletedTask;
    }

    public Task<ExternalAuthState?> GetAndRemoveExternalAuthState(string stateValue)
    {
        if (_externalAuthStates.TryRemove(stateValue, out var state) && state.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return Task.FromResult<ExternalAuthState?>(state);
        }
        return Task.FromResult<ExternalAuthState?>(null);
    }

    private void CleanupExpiredAuthCodes()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var kvp in _authCodes)
        {
            if (kvp.Value.ExpiresAt <= now)
                _authCodes.TryRemove(kvp.Key, out _);
        }
    }

    private void CleanupExpiredRefreshTokens()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var kvp in _refreshTokens)
        {
            if (kvp.Value.ExpiresAt <= now)
                _refreshTokens.TryRemove(kvp.Key, out _);
        }
    }

    private void CleanupExpiredAuthorizeRequests()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var kvp in _authorizeRequests)
        {
            if (kvp.Value.ExpiresAt <= now)
                _authorizeRequests.TryRemove(kvp.Key, out _);
        }
    }

    private void CleanupExpiredExternalAuthStates()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var kvp in _externalAuthStates)
        {
            if (kvp.Value.ExpiresAt <= now)
                _externalAuthStates.TryRemove(kvp.Key, out _);
        }
    }
}
