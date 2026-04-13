using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.OIDC.EF;

/// <summary>
/// EF Core implementation of <see cref="IOidcTokenStore"/> using a single table with JSON-serialized data.
/// </summary>
public class EntityFrameworkOidcTokenStore<TContext> : IOidcTokenStore
    where TContext : DbContext, IOidcStoreDbContext
{
    private const string TypeAuthCode = "AuthCode";
    private const string TypeRefreshToken = "RefreshToken";
    private const string TypeAuthRequest = "AuthRequest";
    private const string TypeExternalAuth = "ExternalAuth";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly TContext _context;

    public EntityFrameworkOidcTokenStore(TContext context)
    {
        _context = context;
    }

    public async Task StoreAuthorizationCode(AuthorizationCode code)
    {
        var data = SerializeAuthorizationCode(code);
        _context.GetOidcStoreEntries().Add(new OidcStoreEntry
        {
            Key = code.Code,
            Type = TypeAuthCode,
            Data = data,
            ExpiresAt = code.ExpiresAt
        });
        await _context.SaveChangesAsync();
    }

    public async Task<AuthorizationCode?> GetAndRemoveAuthorizationCode(string code)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == code && e.Type == TypeAuthCode);
        if (entry == null)
            return null;

        _context.GetOidcStoreEntries().Remove(entry);
        await _context.SaveChangesAsync();

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        return DeserializeAuthorizationCode(entry.Data);
    }

    public async Task StoreRefreshToken(RefreshToken token)
    {
        var data = SerializeRefreshToken(token);
        _context.GetOidcStoreEntries().Add(new OidcStoreEntry
        {
            Key = token.Token,
            Type = TypeRefreshToken,
            Data = data,
            ExpiresAt = token.ExpiresAt
        });
        await _context.SaveChangesAsync();
    }

    public async Task<RefreshToken?> GetRefreshToken(string token)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == token && e.Type == TypeRefreshToken);
        if (entry == null || entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        return DeserializeRefreshToken(entry.Data);
    }

    public async Task RemoveRefreshToken(string token)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == token && e.Type == TypeRefreshToken);
        if (entry != null)
        {
            _context.GetOidcStoreEntries().Remove(entry);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ReplaceRefreshToken(string oldToken, RefreshToken newToken)
    {
        var oldEntry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == oldToken && e.Type == TypeRefreshToken);
        if (oldEntry != null)
            _context.GetOidcStoreEntries().Remove(oldEntry);

        var data = SerializeRefreshToken(newToken);
        _context.GetOidcStoreEntries().Add(new OidcStoreEntry
        {
            Key = newToken.Token,
            Type = TypeRefreshToken,
            Data = data,
            ExpiresAt = newToken.ExpiresAt
        });
        await _context.SaveChangesAsync();
    }

    public async Task StoreAuthorizeRequest(string requestId, AuthorizeRequest request)
    {
        var data = JsonSerializer.Serialize(request, JsonOptions);
        _context.GetOidcStoreEntries().Add(new OidcStoreEntry
        {
            Key = requestId,
            Type = TypeAuthRequest,
            Data = data,
            ExpiresAt = request.ExpiresAt
        });
        await _context.SaveChangesAsync();
    }

    public async Task<AuthorizeRequest?> GetAndRemoveAuthorizeRequest(string requestId)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == requestId && e.Type == TypeAuthRequest);
        if (entry == null)
            return null;

        _context.GetOidcStoreEntries().Remove(entry);
        await _context.SaveChangesAsync();

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        return JsonSerializer.Deserialize<AuthorizeRequest>(entry.Data, JsonOptions);
    }

    public async Task<AuthorizeRequest?> GetAuthorizeRequest(string requestId)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == requestId && e.Type == TypeAuthRequest);
        if (entry == null || entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        return JsonSerializer.Deserialize<AuthorizeRequest>(entry.Data, JsonOptions);
    }

    public async Task StoreExternalAuthState(ExternalAuthState state)
    {
        var data = JsonSerializer.Serialize(state, JsonOptions);
        _context.GetOidcStoreEntries().Add(new OidcStoreEntry
        {
            Key = state.State,
            Type = TypeExternalAuth,
            Data = data,
            ExpiresAt = state.ExpiresAt
        });
        await _context.SaveChangesAsync();
    }

    public async Task<ExternalAuthState?> GetAndRemoveExternalAuthState(string stateValue)
    {
        var entry = await _context.GetOidcStoreEntries()
            .FirstOrDefaultAsync(e => e.Key == stateValue && e.Type == TypeExternalAuth);
        if (entry == null)
            return null;

        _context.GetOidcStoreEntries().Remove(entry);
        await _context.SaveChangesAsync();

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return null;

        return JsonSerializer.Deserialize<ExternalAuthState>(entry.Data, JsonOptions);
    }

    /// <summary>
    /// Remove all expired entries. Can be called periodically for cleanup.
    /// </summary>
    public async Task CleanupExpired()
    {
        var now = DateTimeOffset.UtcNow;
        var expired = await _context.GetOidcStoreEntries().Where(e => e.ExpiresAt <= now).ToListAsync();
        if (expired.Count > 0)
        {
            _context.GetOidcStoreEntries().RemoveRange(expired);
            await _context.SaveChangesAsync();
        }
    }

    #region Claim Serialization

    private static string SerializeAuthorizationCode(AuthorizationCode code)
    {
        var dto = new AuthorizationCodeDto
        {
            Code = code.Code,
            ClientId = code.ClientId,
            RedirectUri = code.RedirectUri,
            CodeChallenge = code.CodeChallenge,
            CodeChallengeMethod = code.CodeChallengeMethod,
            Claims = code.Claims.Select(c => new ClaimDto { Type = c.Type, Value = c.Value }).ToList(),
            Scope = code.Scope,
            Nonce = code.Nonce,
            ExpiresAt = code.ExpiresAt
        };
        return JsonSerializer.Serialize(dto, JsonOptions);
    }

    private static AuthorizationCode DeserializeAuthorizationCode(string json)
    {
        var dto = JsonSerializer.Deserialize<AuthorizationCodeDto>(json, JsonOptions)!;
        return new AuthorizationCode
        {
            Code = dto.Code,
            ClientId = dto.ClientId,
            RedirectUri = dto.RedirectUri,
            CodeChallenge = dto.CodeChallenge,
            CodeChallengeMethod = dto.CodeChallengeMethod,
            Claims = dto.Claims.Select(c => new Claim(c.Type, c.Value)),
            Scope = dto.Scope,
            Nonce = dto.Nonce,
            ExpiresAt = dto.ExpiresAt
        };
    }

    private static string SerializeRefreshToken(RefreshToken token)
    {
        var dto = new RefreshTokenDto
        {
            Token = token.Token,
            ClientId = token.ClientId,
            Claims = token.Claims.Select(c => new ClaimDto { Type = c.Type, Value = c.Value }).ToList(),
            Scope = token.Scope,
            ExpiresAt = token.ExpiresAt
        };
        return JsonSerializer.Serialize(dto, JsonOptions);
    }

    private static RefreshToken DeserializeRefreshToken(string json)
    {
        var dto = JsonSerializer.Deserialize<RefreshTokenDto>(json, JsonOptions)!;
        return new RefreshToken
        {
            Token = dto.Token,
            ClientId = dto.ClientId,
            Claims = dto.Claims.Select(c => new Claim(c.Type, c.Value)),
            Scope = dto.Scope,
            ExpiresAt = dto.ExpiresAt
        };
    }

    #endregion

    #region DTOs for JSON serialization (Claims aren't directly serializable)

    private class ClaimDto
    {
        public required string Type { get; set; }
        public required string Value { get; set; }
    }

    private class AuthorizationCodeDto
    {
        public required string Code { get; set; }
        public required string ClientId { get; set; }
        public required string RedirectUri { get; set; }
        public required string CodeChallenge { get; set; }
        public required string CodeChallengeMethod { get; set; }
        public required List<ClaimDto> Claims { get; set; }
        public required string Scope { get; set; }
        public string? Nonce { get; set; }
        public required DateTimeOffset ExpiresAt { get; set; }
    }

    private class RefreshTokenDto
    {
        public required string Token { get; set; }
        public required string ClientId { get; set; }
        public required List<ClaimDto> Claims { get; set; }
        public required string Scope { get; set; }
        public required DateTimeOffset ExpiresAt { get; set; }
    }

    #endregion
}
