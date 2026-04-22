using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

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

    protected IExternalUserLinker GetExternalUserLinker(HttpContext context) =>
        context.RequestServices.GetRequiredService<IExternalUserLinker>();

    protected ExternalOidcDiscoveryCache GetDiscoveryCache(HttpContext context) =>
        context.RequestServices.GetRequiredService<ExternalOidcDiscoveryCache>();

    protected IHttpClientFactory GetHttpClientFactory(HttpContext context) =>
        context.RequestServices.GetRequiredService<IHttpClientFactory>();

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

        if (Config.ExternalProviders.Count > 0)
        {
            if (Options.EnableExternalProviders)
                MapExternalProviders(group);
            if (Options.EnableExternalLogin)
                MapExternalLogin(group);
            if (Options.EnableExternalCallback)
                MapExternalCallback(group);
        }
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
            EndSessionEndpoint = $"{issuer}/logout",
        };
        return Results.Json(document);
    }

    protected virtual IResult HandleJwks(HttpContext context)
    {
        var signer = GetTokenSigner(context);
        return Results.Json(signer.GetJwksDocument());
    }

    protected virtual string GetLoginRedirectUrl(AuthorizeRequest request, string requestId)
    {
        var separator = Config.LoginPageUrl.Contains('?') ? "&" : "?";
        return $"{Config.LoginPageUrl}{separator}oidc_request_id={Uri.EscapeDataString(requestId)}";
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
        if (
            string.IsNullOrEmpty(clientId)
            || string.IsNullOrEmpty(redirectUri)
            || string.IsNullOrEmpty(responseType)
            || string.IsNullOrEmpty(state)
            || string.IsNullOrEmpty(codeChallenge)
            || string.IsNullOrEmpty(codeChallengeMethod)
        )
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Missing required parameters.",
                },
                statusCode: 400
            );
        }

        if (responseType != "code")
        {
            return Results.Json(
                new
                {
                    error = "unsupported_response_type",
                    error_description = "Only 'code' response type is supported.",
                },
                statusCode: 400
            );
        }

        if (codeChallengeMethod != "S256")
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Only S256 code challenge method is supported.",
                },
                statusCode: 400
            );
        }

        // Validate client
        var client = Config.Clients.FirstOrDefault(c => c.ClientId == clientId);
        if (client == null)
        {
            return Results.Json(
                new { error = "unauthorized_client", error_description = "Unknown client_id." },
                statusCode: 400
            );
        }

        if (!client.RedirectUris.Contains(redirectUri))
        {
            return Results.Json(
                new { error = "invalid_request", error_description = "Invalid redirect_uri." },
                statusCode: 400
            );
        }

        // prompt=none OIDC Core 3.1.2.1
        var prompt = query[OpenIdConnectParameterNames.Prompt].FirstOrDefault();
        if (prompt == OpenIdConnectPrompt.None)
        {
            var errUrl = QueryHelpers.AddQueryString(
                redirectUri,
                new Dictionary<string, string?>
                {
                    [OpenIdConnectParameterNames.Error] = "login_required",
                    [OpenIdConnectParameterNames.State] = state,
                }
            );
            return Results.Redirect(errUrl);
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
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
        };

        var store = GetTokenStore(context);
        await store.StoreAuthorizeRequest(requestId, authorizeRequest);

        // Redirect to login page
        return Results.Redirect(GetLoginRedirectUrl(authorizeRequest, requestId));
    }

    protected virtual async Task<IResult> HandleAuthorizeComplete(
        AuthorizeCompleteRequest request,
        HttpContext context
    )
    {
        var store = GetTokenStore(context);
        var authorizeRequest = await store.GetAndRemoveAuthorizeRequest(request.OidcRequestId);
        if (authorizeRequest == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Invalid or expired OIDC request.",
                },
                statusCode: 400
            );
        }

        // Get user claims from the user token
        var claimsProvider = GetClaimsProvider(context);
        var claims = await claimsProvider.GetClaimsFromUserToken(request.UserToken);
        if (claims == null)
        {
            return Results.Json(
                new { error = "access_denied", error_description = "Invalid user token." },
                statusCode: 400
            );
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
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.AuthorizationCodeLifetimeSeconds),
        };
        await store.StoreAuthorizationCode(authCode);

        // Build redirect URL with code and state in hash fragment (MSAL expects fragment response mode)
        var redirectUrl =
            $"{authorizeRequest.RedirectUri}#code={Uri.EscapeDataString(code)}&state={Uri.EscapeDataString(authorizeRequest.State)}";

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
            _ => Results.Json(
                new
                {
                    error = "unsupported_grant_type",
                    error_description = "Unsupported grant_type.",
                },
                statusCode: 400
            ),
        };
    }

    protected virtual async Task<IResult> HandleAuthorizationCodeGrant(
        IFormCollection form,
        HttpContext context
    )
    {
        var code = form["code"].FirstOrDefault();
        var redirectUri = form["redirect_uri"].FirstOrDefault();
        var clientId = form["client_id"].FirstOrDefault();
        var codeVerifier = form["code_verifier"].FirstOrDefault();

        if (
            string.IsNullOrEmpty(code)
            || string.IsNullOrEmpty(redirectUri)
            || string.IsNullOrEmpty(clientId)
            || string.IsNullOrEmpty(codeVerifier)
        )
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Missing required parameters.",
                },
                statusCode: 400
            );
        }

        var store = GetTokenStore(context);
        var authCode = await store.GetAndRemoveAuthorizationCode(code);
        if (authCode == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_grant",
                    error_description = "Invalid or expired authorization code.",
                },
                statusCode: 400
            );
        }

        // Validate client and redirect URI match
        if (authCode.ClientId != clientId || authCode.RedirectUri != redirectUri)
        {
            return Results.Json(
                new
                {
                    error = "invalid_grant",
                    error_description = "Client ID or redirect URI mismatch.",
                },
                statusCode: 400
            );
        }

        // Validate PKCE
        if (
            !PkceValidator.Validate(
                codeVerifier,
                authCode.CodeChallenge,
                authCode.CodeChallengeMethod
            )
        )
        {
            return Results.Json(
                new { error = "invalid_grant", error_description = "PKCE validation failed." },
                statusCode: 400
            );
        }

        var signer = GetTokenSigner(context);
        var accessToken = signer.CreateAccessToken(authCode.Claims, clientId, authCode.Scope);
        var idToken = signer.CreateIdToken(authCode.Claims, clientId, authCode.Nonce);

        var response = new TokenResponse
        {
            AccessToken = accessToken,
            IdToken = idToken,
            ExpiresIn = Config.AccessTokenLifetimeSeconds,
            Scope = authCode.Scope,
        };

        // Always issue refresh tokens for PKCE-protected clients
        var refreshTokenValue = GenerateRandomString();
        var refreshToken = new RefreshToken
        {
            Token = refreshTokenValue,
            ClientId = clientId,
            Claims = authCode.Claims,
            Scope = authCode.Scope,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.RefreshTokenLifetimeSeconds),
        };
        await store.StoreRefreshToken(refreshToken);
        response.RefreshToken = refreshTokenValue;

        return Results.Json(response);
    }

    protected virtual async Task<IResult> HandleRefreshTokenGrant(
        IFormCollection form,
        HttpContext context
    )
    {
        var refreshTokenValue = form["refresh_token"].FirstOrDefault();
        var clientId = form["client_id"].FirstOrDefault();

        if (string.IsNullOrEmpty(refreshTokenValue) || string.IsNullOrEmpty(clientId))
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Missing required parameters.",
                },
                statusCode: 400
            );
        }

        var store = GetTokenStore(context);
        var refreshToken = await store.GetRefreshToken(refreshTokenValue);
        if (refreshToken == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_grant",
                    error_description = "Invalid or expired refresh token.",
                },
                statusCode: 400
            );
        }

        if (refreshToken.ClientId != clientId)
        {
            return Results.Json(
                new { error = "invalid_grant", error_description = "Client ID mismatch." },
                statusCode: 400
            );
        }

        var signer = GetTokenSigner(context);
        var accessToken = signer.CreateAccessToken(
            refreshToken.Claims,
            clientId,
            refreshToken.Scope
        );
        var idToken = signer.CreateIdToken(refreshToken.Claims, clientId, null);

        // Refresh token rotation — issue new token, remove old one
        var newRefreshTokenValue = GenerateRandomString();
        var newRefreshToken = new RefreshToken
        {
            Token = newRefreshTokenValue,
            ClientId = clientId,
            Claims = refreshToken.Claims,
            Scope = refreshToken.Scope,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.RefreshTokenLifetimeSeconds),
        };
        await store.ReplaceRefreshToken(refreshTokenValue, newRefreshToken);

        var response = new TokenResponse
        {
            AccessToken = accessToken,
            IdToken = idToken,
            RefreshToken = newRefreshTokenValue,
            ExpiresIn = Config.AccessTokenLifetimeSeconds,
            Scope = refreshToken.Scope,
        };

        return Results.Json(response);
    }

    protected virtual IResult HandleEndSession(HttpContext context)
    {
        var postLogoutRedirectUri = context
            .Request.Query["post_logout_redirect_uri"]
            .FirstOrDefault();

        if (!string.IsNullOrEmpty(postLogoutRedirectUri))
        {
            // Validate the redirect URI belongs to a registered client
            var isValid = Config.Clients.Any(c =>
                c.PostLogoutRedirectUris.Contains(postLogoutRedirectUri)
            );
            if (isValid)
            {
                return Results.Redirect(postLogoutRedirectUri);
            }
        }

        return Results.Ok();
    }

    protected virtual IResult HandleExternalProviders(HttpContext context)
    {
        var providers = Config.ExternalProviders.Select(p => new
        {
            name = p.Name,
            displayName = p.DisplayName ?? p.Name,
        });
        return Results.Json(providers);
    }

    protected virtual async Task<IResult> HandleExternalLogin(HttpContext context)
    {
        var query = context.Request.Query;
        var providerName = query["provider"].FirstOrDefault();
        var oidcRequestId = query["oidc_request_id"].FirstOrDefault();

        if (string.IsNullOrEmpty(providerName) || string.IsNullOrEmpty(oidcRequestId))
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Missing provider or oidc_request_id.",
                },
                statusCode: 400
            );
        }

        // Validate the provider exists
        var provider = Config.ExternalProviders.FirstOrDefault(p => p.Name == providerName);
        if (provider == null)
        {
            return Results.Json(
                new { error = "invalid_request", error_description = "Unknown external provider." },
                statusCode: 400
            );
        }

        // Validate the authorize request exists (non-destructive peek)
        var store = GetTokenStore(context);
        var authorizeRequest = await store.GetAuthorizeRequest(oidcRequestId);
        if (authorizeRequest == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Invalid or expired OIDC request.",
                },
                statusCode: 400
            );
        }

        // Generate state and nonce
        var state = GenerateRandomString();
        var nonce = GenerateRandomString();

        // Generate PKCE if enabled
        string? codeVerifier = null;
        string? codeChallenge = null;
        if (provider.UsePkce)
        {
            (codeVerifier, codeChallenge) = PkceValidator.GenerateS256Pkce();
        }

        // Store external auth state
        var externalState = new ExternalAuthState
        {
            State = state,
            OidcRequestId = oidcRequestId,
            ProviderName = providerName,
            CodeVerifier = codeVerifier,
            Nonce = nonce,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
        };
        await store.StoreExternalAuthState(externalState);

        // Fetch external provider's discovery document
        var discoveryCache = GetDiscoveryCache(context);
        var externalConfig = await discoveryCache.GetConfiguration(provider.Authority);

        // Build the external authorize URL
        var callbackUrl = $"{Config.Issuer.TrimEnd('/')}/external/callback";
        var authorizeUrl =
            externalConfig.AuthorizationEndpoint
            + $"?client_id={Uri.EscapeDataString(provider.ClientId)}"
            + $"&redirect_uri={Uri.EscapeDataString(callbackUrl)}"
            + "&response_type=code"
            + $"&scope={Uri.EscapeDataString(provider.Scopes)}"
            + $"&state={Uri.EscapeDataString(state)}"
            + $"&nonce={Uri.EscapeDataString(nonce)}";

        if (provider.UsePkce && codeChallenge != null)
        {
            authorizeUrl +=
                $"&code_challenge={Uri.EscapeDataString(codeChallenge)}"
                + $"&code_challenge_method=S256";
        }

        return Results.Redirect(authorizeUrl);
    }

    protected virtual async Task<IResult> HandleExternalCallback(HttpContext context)
    {
        var query = context.Request.Query;
        var code = query["code"].FirstOrDefault();
        var stateValue = query["state"].FirstOrDefault();
        var error = query["error"].FirstOrDefault();

        if (!string.IsNullOrEmpty(error))
        {
            var errorDescription =
                query["error_description"].FirstOrDefault() ?? "External authentication failed.";
            return Results.Json(
                new { error, error_description = errorDescription },
                statusCode: 400
            );
        }

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(stateValue))
        {
            return Results.Json(
                new { error = "invalid_request", error_description = "Missing code or state." },
                statusCode: 400
            );
        }

        // Retrieve and validate external auth state
        var store = GetTokenStore(context);
        var externalState = await store.GetAndRemoveExternalAuthState(stateValue);
        if (externalState == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Invalid or expired external auth state.",
                },
                statusCode: 400
            );
        }

        // Find the provider
        var provider = Config.ExternalProviders.FirstOrDefault(p =>
            p.Name == externalState.ProviderName
        );
        if (provider == null)
        {
            return Results.Json(
                new
                {
                    error = "server_error",
                    error_description = "External provider configuration not found.",
                },
                statusCode: 500
            );
        }

        // Exchange code for tokens with external provider
        var discoveryCache = GetDiscoveryCache(context);
        var externalConfig = await discoveryCache.GetConfiguration(provider.Authority);
        var callbackUrl = $"{Config.Issuer.TrimEnd('/')}/external/callback";

        var httpClientFactory = GetHttpClientFactory(context);
        var httpClient = httpClientFactory.CreateClient("OidcExternal");

        var tokenRequestParams = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = callbackUrl,
            ["client_id"] = provider.ClientId,
        };

        if (!string.IsNullOrEmpty(provider.ClientSecret))
        {
            tokenRequestParams["client_secret"] = provider.ClientSecret;
        }

        if (provider.UsePkce && externalState.CodeVerifier != null)
        {
            tokenRequestParams["code_verifier"] = externalState.CodeVerifier;
        }

        var tokenRequest = new HttpRequestMessage(HttpMethod.Post, externalConfig.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(tokenRequestParams),
        };
        tokenRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var tokenResponse = await httpClient.SendAsync(tokenRequest);
        var tokenResponseBody = await tokenResponse.Content.ReadAsStringAsync();
        var externalTokenResponse = JsonSerializer.Deserialize<ExternalTokenResponse>(
            tokenResponseBody
        );

        if (externalTokenResponse == null || !string.IsNullOrEmpty(externalTokenResponse.Error))
        {
            var desc =
                externalTokenResponse?.ErrorDescription
                ?? "Failed to exchange code with external provider.";
            return Results.Json(
                new { error = "server_error", error_description = desc },
                statusCode: 500
            );
        }

        if (string.IsNullOrEmpty(externalTokenResponse.IdToken))
        {
            return Results.Json(
                new
                {
                    error = "server_error",
                    error_description = "External provider did not return an id_token.",
                },
                statusCode: 500
            );
        }

        // Validate the external id_token
        var externalClaims = await ValidateExternalIdToken(
            externalTokenResponse.IdToken,
            provider,
            externalConfig,
            externalState.Nonce
        );
        if (externalClaims == null)
        {
            return Results.Json(
                new
                {
                    error = "server_error",
                    error_description = "External id_token validation failed.",
                },
                statusCode: 500
            );
        }

        // Link external identity to local user
        var linker = GetExternalUserLinker(context);
        var localClaims = await linker.LinkExternalUser(externalState.ProviderName, externalClaims);
        if (localClaims == null)
        {
            return Results.Json(
                new
                {
                    error = "access_denied",
                    error_description = "External user could not be linked to a local account.",
                },
                statusCode: 403
            );
        }

        // Retrieve the original authorize request (consume it now)
        var authorizeRequest = await store.GetAndRemoveAuthorizeRequest(
            externalState.OidcRequestId
        );
        if (authorizeRequest == null)
        {
            return Results.Json(
                new
                {
                    error = "invalid_request",
                    error_description = "Original OIDC request has expired.",
                },
                statusCode: 400
            );
        }

        // Create authorization code and redirect back to the OIDC client (same as local flow)
        var authCode = GenerateRandomString();
        var authorizationCode = new AuthorizationCode
        {
            Code = authCode,
            ClientId = authorizeRequest.ClientId,
            RedirectUri = authorizeRequest.RedirectUri,
            CodeChallenge = authorizeRequest.CodeChallenge,
            CodeChallengeMethod = authorizeRequest.CodeChallengeMethod,
            Claims = localClaims,
            Scope = authorizeRequest.Scope,
            Nonce = authorizeRequest.Nonce,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Config.AuthorizationCodeLifetimeSeconds),
        };
        await store.StoreAuthorizationCode(authorizationCode);

        // Redirect back to OIDC client with code and state
        var redirectUrl =
            $"{authorizeRequest.RedirectUri}#code={Uri.EscapeDataString(authCode)}&state={Uri.EscapeDataString(authorizeRequest.State)}";
        return Results.Redirect(redirectUrl);
    }

    protected virtual Task<IEnumerable<Claim>?> ValidateExternalIdToken(
        string idToken,
        ExternalOidcProviderConfig provider,
        OpenIdConnectConfiguration externalConfig,
        string expectedNonce
    )
    {
        try
        {
            var validationParameters = new TokenValidationParameters
            {
                ValidIssuer = externalConfig.Issuer,
                ValidAudience = provider.ClientId,
                IssuerSigningKeys = externalConfig.SigningKeys,
                ValidateIssuerSigningKey = true,
                ValidateIssuer = provider.ValidateIssuer,
                ValidateAudience = true,
                ValidateLifetime = true,
            };

            var handler = new JwtSecurityTokenHandler();
            handler.InboundClaimTypeMap.Clear();
            var principal = handler.ValidateToken(idToken, validationParameters, out _);

            // Validate nonce
            var nonceClaim = principal.FindFirst("nonce");
            if (nonceClaim == null || nonceClaim.Value != expectedNonce)
            {
                return Task.FromResult<IEnumerable<Claim>?>(null);
            }

            return Task.FromResult<IEnumerable<Claim>?>(principal.Claims);
        }
        catch
        {
            return Task.FromResult<IEnumerable<Claim>?>(null);
        }
    }

    #endregion

    #region Mapping Methods

    protected virtual RouteHandlerBuilder MapDiscovery(RouteGroupBuilder group) =>
        group
            .MapGet(
                ".well-known/openid-configuration",
                (HttpContext context) => HandleDiscovery(context)
            )
            .WithName("OidcDiscovery");

    protected virtual RouteHandlerBuilder MapJwks(RouteGroupBuilder group) =>
        group
            .MapGet(".well-known/keys", (HttpContext context) => HandleJwks(context))
            .WithName("OidcJwks");

    protected virtual RouteHandlerBuilder MapAuthorize(RouteGroupBuilder group) =>
        group
            .MapGet(
                "authorize",
                (Delegate)(async (HttpContext context) => await HandleAuthorize(context))
            )
            .WithName("OidcAuthorize");

    protected virtual RouteHandlerBuilder MapAuthorizeComplete(RouteGroupBuilder group) =>
        group
            .MapPost(
                "authorize/complete",
                (AuthorizeCompleteRequest request, HttpContext context) =>
                    HandleAuthorizeComplete(request, context)
            )
            .WithName("OidcAuthorizeComplete");

    protected virtual RouteHandlerBuilder MapToken(RouteGroupBuilder group) =>
        group
            .MapPost("token", (Delegate)(async (HttpContext context) => await HandleToken(context)))
            .WithName("OidcToken");

    protected virtual RouteHandlerBuilder MapEndSession(RouteGroupBuilder group) =>
        group
            .MapGet("logout", (HttpContext context) => HandleEndSession(context))
            .WithName("OidcEndSession");

    protected virtual RouteHandlerBuilder MapExternalProviders(RouteGroupBuilder group) =>
        group
            .MapGet("external/providers", (HttpContext context) => HandleExternalProviders(context))
            .WithName("OidcExternalProviders");

    protected virtual RouteHandlerBuilder MapExternalLogin(RouteGroupBuilder group) =>
        group
            .MapGet(
                "external/login",
                (Delegate)(async (HttpContext context) => await HandleExternalLogin(context))
            )
            .WithName("OidcExternalLogin");

    protected virtual RouteHandlerBuilder MapExternalCallback(RouteGroupBuilder group) =>
        group
            .MapGet(
                "external/callback",
                (Delegate)(async (HttpContext context) => await HandleExternalCallback(context))
            )
            .WithName("OidcExternalCallback");

    #endregion

    protected static string GenerateRandomString()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }
}
