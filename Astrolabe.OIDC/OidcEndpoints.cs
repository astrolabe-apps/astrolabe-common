using System.Security.Cryptography;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.OIDC;

/// <summary>
/// Request body for the authorize/complete endpoint.
/// </summary>
public record AuthorizeCompleteRequest(string OidcRequestId, string UserToken);

/// <summary>
/// Response body for the authorize/complete endpoint.
/// </summary>
public record AuthorizeCompleteResponse(string RedirectUrl);

/// <summary>
/// Abstract base class for OIDC endpoints using Minimal APIs.
/// Follows the same pattern as <see cref="LocalUserEndpoints{TNewUser,TUserId}"/>:
/// override handler methods to customize business logic,
/// override mapping methods to customize routes, authorization, or metadata.
/// </summary>
public abstract class OidcEndpoints
{
    protected OidcProviderConfig Config { get; }
    protected OidcEndpointOptions Options { get; }

    protected OidcEndpoints(OidcProviderConfig config, OidcEndpointOptions? options = null)
    {
        Config = config;
        Options = options ?? new OidcEndpointOptions();
    }

    protected IOidcTokenStore GetTokenStore(HttpContext context) =>
        context.RequestServices.GetRequiredService<IOidcTokenStore>();

    protected IOidcUserClaimsProvider GetClaimsProvider(HttpContext context) =>
        context.RequestServices.GetRequiredService<IOidcUserClaimsProvider>();

    protected OidcTokenSigner GetTokenSigner(HttpContext context) =>
        context.RequestServices.GetRequiredService<OidcTokenSigner>();

    /// <summary>
    /// Maps all enabled OIDC endpoints to the route group.
    /// </summary>
    public virtual void MapEndpoints(RouteGroupBuilder group)
    {
        if (Options.EnableDiscovery)
            MapDiscovery(group);
        if (Options.EnableJwks)
            MapJwks(group);
        if (Options.EnableAuthorize)
            MapAuthorize(group);
        if (Options.EnableAuthorizeComplete)
            MapAuthorizeComplete(group);
        if (Options.EnableToken)
            MapToken(group);
        if (Options.EnableEndSession)
            MapEndSession(group);
    }

    #region Handler Methods

    protected virtual IResult HandleDiscovery(HttpContext context)
    {
        var issuer = Config.Issuer.TrimEnd('/');
        var document = new OidcDiscoveryDocument
        {
            Issuer = issuer,
            AuthorizationEndpoint = $"{issuer}/authorize",
            TokenEndpoint = $"{issuer}/token",
            JwksUri = $"{issuer}/.well-known/keys",
            EndSessionEndpoint = $"{issuer}/logout"
        };
        return Results.Json(document);
    }

    protected virtual IResult HandleJwks(HttpContext context)
    {
        var signer = GetTokenSigner(context);
        return Results.Json(signer.GetJwksDocument());
    }

    protected virtual async Task<IResult> HandleAuthorize(HttpContext context)
    {
        var query = context.Request.Query;
        var clientId = query["client_id"].FirstOrDefault();
        var redirectUri = query["redirect_uri"].FirstOrDefault();
        var responseType = query["response_type"].FirstOrDefault();
        var scope = query["scope"].FirstOrDefault() ?? "openid";
        var state = query["state"].FirstOrDefault();
        var nonce = query["nonce"].FirstOrDefault();
        var codeChallenge = query["code_challenge"].FirstOrDefault();
        var codeChallengeMethod = query["code_challenge_method"].FirstOrDefault();

        // Validate required params
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(redirectUri) ||
            string.IsNullOrEmpty(responseType) || string.IsNullOrEmpty(state) ||
            string.IsNullOrEmpty(codeChallenge) || string.IsNullOrEmpty(codeChallengeMethod))
        {
            return Results.Json(new { error = "invalid_request", error_description = "Missing required parameters." }, statusCode: 400);
        }

        if (responseType != "code")
        {
            return Results.Json(new { error = "unsupported_response_type", error_description = "Only 'code' response type is supported." }, statusCode: 400);
        }

        if (codeChallengeMethod != "S256")
        {
            return Results.Json(new { error = "invalid_request", error_description = "Only S256 code challenge method is supported." }, statusCode: 400);
        }

        // Validate client
        var client = Config.Clients.FirstOrDefault(c => c.ClientId == clientId);
        if (client == null)
        {
            return Results.Json(new { error = "unauthorized_client", error_description = "Unknown client_id." }, statusCode: 400);
        }

        if (!client.RedirectUris.Contains(redirectUri))
        {
            return Results.Json(new { error = "invalid_request", error_description = "Invalid redirect_uri." }, statusCode: 400);
        }

        // Store authorize request
        var requestId = GenerateRandomString();
        var authorizeRequest = new AuthorizeRequest
        {
            ClientId = clientId,
            RedirectUri = redirectUri,
            ResponseType = responseType,
            Scope = scope,
            State = state,
            Nonce = nonce,
            CodeChallenge = codeChallenge,
            CodeChallengeMethod = codeChallengeMethod,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10)
        };

        var store = GetTokenStore(context);
        await store.StoreAuthorizeRequest(requestId, authorizeRequest);

        // Redirect to SPA login page
        var separator = Config.LoginPageUrl.Contains('?') ? "&" : "?";
        var loginUrl = $"{Config.LoginPageUrl}{separator}oidc_request_id={Uri.EscapeDataString(requestId)}";
        return Results.Redirect(loginUrl);
    }

    protected virtual async Task<IResult> HandleAuthorizeComplete(AuthorizeCompleteRequest request, HttpContext context)
    {
        var store = GetTokenStore(context);
        var authorizeRequest = await store.GetAndRemoveAuthorizeRequest(request.OidcRequestId);
        if (authorizeRequest == null)
        {
            return Results.Json(new { error = "invalid_request", error_description = "Invalid or expired OIDC request." }, statusCode: 400);
        }

        // Get user claims from the user token
        var claimsProvider = GetClaimsProvider(context);
        var claims = await claimsProvider.GetClaimsFromUserToken(request.UserToken);
        if (claims == null)
        {
            return Results.Json(new { error = "access_denied", error_description = "Invalid user token." }, statusCode: 400);
        }

        // Create and store authorization code
        var code = GenerateRandomString();
        var authCode = new AuthorizationCode
        {
            Code = code,
            ClientId = authorizeRequest.ClientId,
            RedirectUri = authorizeRequest.RedirectUri,
            CodeChallenge = authorizeRequest.CodeChallenge,
            CodeChallengeMethod = authorizeRequest.CodeChallengeMethod,
            Claims = claims,
            Scope = authorizeRequest.Scope,
            Nonce = authorizeRequest.Nonce,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.AuthorizationCodeLifetimeSeconds)
        };
        await store.StoreAuthorizationCode(authCode);

        // Build redirect URL with code and state in hash fragment (MSAL expects fragment response mode)
        var redirectUrl = $"{authorizeRequest.RedirectUri}#code={Uri.EscapeDataString(code)}&state={Uri.EscapeDataString(authorizeRequest.State)}";

        return Results.Json(new AuthorizeCompleteResponse(redirectUrl));
    }

    protected virtual async Task<IResult> HandleToken(HttpContext context)
    {
        var form = await context.Request.ReadFormAsync();
        var grantType = form["grant_type"].FirstOrDefault();

        return grantType switch
        {
            "authorization_code" => await HandleAuthorizationCodeGrant(form, context),
            "refresh_token" => await HandleRefreshTokenGrant(form, context),
            _ => Results.Json(new { error = "unsupported_grant_type", error_description = "Unsupported grant_type." }, statusCode: 400)
        };
    }

    protected virtual async Task<IResult> HandleAuthorizationCodeGrant(IFormCollection form, HttpContext context)
    {
        var code = form["code"].FirstOrDefault();
        var redirectUri = form["redirect_uri"].FirstOrDefault();
        var clientId = form["client_id"].FirstOrDefault();
        var codeVerifier = form["code_verifier"].FirstOrDefault();

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(redirectUri) ||
            string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(codeVerifier))
        {
            return Results.Json(new { error = "invalid_request", error_description = "Missing required parameters." }, statusCode: 400);
        }

        var store = GetTokenStore(context);
        var authCode = await store.GetAndRemoveAuthorizationCode(code);
        if (authCode == null)
        {
            return Results.Json(new { error = "invalid_grant", error_description = "Invalid or expired authorization code." }, statusCode: 400);
        }

        // Validate client and redirect URI match
        if (authCode.ClientId != clientId || authCode.RedirectUri != redirectUri)
        {
            return Results.Json(new { error = "invalid_grant", error_description = "Client ID or redirect URI mismatch." }, statusCode: 400);
        }

        // Validate PKCE
        if (!PkceValidator.Validate(codeVerifier, authCode.CodeChallenge, authCode.CodeChallengeMethod))
        {
            return Results.Json(new { error = "invalid_grant", error_description = "PKCE validation failed." }, statusCode: 400);
        }

        var signer = GetTokenSigner(context);
        var accessToken = signer.CreateAccessToken(authCode.Claims, clientId, authCode.Scope);
        var idToken = signer.CreateIdToken(authCode.Claims, clientId, authCode.Nonce);

        var response = new TokenResponse
        {
            AccessToken = accessToken,
            IdToken = idToken,
            ExpiresIn = Config.AccessTokenLifetimeSeconds,
            Scope = authCode.Scope
        };

        // Always issue refresh tokens for PKCE-protected clients
        var refreshTokenValue = GenerateRandomString();
        var refreshToken = new RefreshToken
        {
            Token = refreshTokenValue,
            ClientId = clientId,
            Claims = authCode.Claims,
            Scope = authCode.Scope,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.RefreshTokenLifetimeSeconds)
        };
        await store.StoreRefreshToken(refreshToken);
        response.RefreshToken = refreshTokenValue;

        return Results.Json(response);
    }

    protected virtual async Task<IResult> HandleRefreshTokenGrant(IFormCollection form, HttpContext context)
    {
        var refreshTokenValue = form["refresh_token"].FirstOrDefault();
        var clientId = form["client_id"].FirstOrDefault();

        if (string.IsNullOrEmpty(refreshTokenValue) || string.IsNullOrEmpty(clientId))
        {
            return Results.Json(new { error = "invalid_request", error_description = "Missing required parameters." }, statusCode: 400);
        }

        var store = GetTokenStore(context);
        var refreshToken = await store.GetRefreshToken(refreshTokenValue);
        if (refreshToken == null)
        {
            return Results.Json(new { error = "invalid_grant", error_description = "Invalid or expired refresh token." }, statusCode: 400);
        }

        if (refreshToken.ClientId != clientId)
        {
            return Results.Json(new { error = "invalid_grant", error_description = "Client ID mismatch." }, statusCode: 400);
        }

        var signer = GetTokenSigner(context);
        var accessToken = signer.CreateAccessToken(refreshToken.Claims, clientId, refreshToken.Scope);
        var idToken = signer.CreateIdToken(refreshToken.Claims, clientId, null);

        // Refresh token rotation — issue new token, remove old one
        var newRefreshTokenValue = GenerateRandomString();
        var newRefreshToken = new RefreshToken
        {
            Token = newRefreshTokenValue,
            ClientId = clientId,
            Claims = refreshToken.Claims,
            Scope = refreshToken.Scope,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.RefreshTokenLifetimeSeconds)
        };
        await store.ReplaceRefreshToken(refreshTokenValue, newRefreshToken);

        var response = new TokenResponse
        {
            AccessToken = accessToken,
            IdToken = idToken,
            RefreshToken = newRefreshTokenValue,
            ExpiresIn = Config.AccessTokenLifetimeSeconds,
            Scope = refreshToken.Scope
        };

        return Results.Json(response);
    }

    protected virtual IResult HandleEndSession(HttpContext context)
    {
        var postLogoutRedirectUri = context.Request.Query["post_logout_redirect_uri"].FirstOrDefault();

        if (!string.IsNullOrEmpty(postLogoutRedirectUri))
        {
            // Validate the redirect URI belongs to a registered client
            var isValid = Config.Clients.Any(c => c.PostLogoutRedirectUris.Contains(postLogoutRedirectUri));
            if (isValid)
            {
                return Results.Redirect(postLogoutRedirectUri);
            }
        }

        return Results.Ok();
    }

    #endregion

    #region Mapping Methods

    protected virtual RouteHandlerBuilder MapDiscovery(RouteGroupBuilder group) =>
        group
            .MapGet(".well-known/openid-configuration", (HttpContext context) => HandleDiscovery(context))
            .WithName("OidcDiscovery");

    protected virtual RouteHandlerBuilder MapJwks(RouteGroupBuilder group) =>
        group
            .MapGet(".well-known/keys", (HttpContext context) => HandleJwks(context))
            .WithName("OidcJwks");

    protected virtual RouteHandlerBuilder MapAuthorize(RouteGroupBuilder group) =>
        group
            .MapGet("authorize", (Delegate)(async (HttpContext context) => await HandleAuthorize(context)))
            .WithName("OidcAuthorize");

    protected virtual RouteHandlerBuilder MapAuthorizeComplete(RouteGroupBuilder group) =>
        group
            .MapPost("authorize/complete", (AuthorizeCompleteRequest request, HttpContext context) => HandleAuthorizeComplete(request, context))
            .WithName("OidcAuthorizeComplete");

    protected virtual RouteHandlerBuilder MapToken(RouteGroupBuilder group) =>
        group
            .MapPost("token", (Delegate)(async (HttpContext context) => await HandleToken(context)))
            .WithName("OidcToken");

    protected virtual RouteHandlerBuilder MapEndSession(RouteGroupBuilder group) =>
        group
            .MapGet("logout", (HttpContext context) => HandleEndSession(context))
            .WithName("OidcEndSession");

    #endregion

    protected static string GenerateRandomString()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }
}
