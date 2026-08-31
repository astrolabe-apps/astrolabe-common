# Astrolabe.OIDC

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.OIDC.svg)](https://www.nuget.org/packages/Astrolabe.OIDC/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An OpenID Connect provider implementation for .NET 8+ applications using Minimal APIs. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.OIDC allows your application to act as an OIDC identity provider. This enables SPAs using MSAL.js (or any OIDC-compliant client) to authenticate against your local user system instead of an external identity provider like Azure AD.

## Installation

```bash
dotnet add package Astrolabe.OIDC
```

## Features

- **Authorization Code Flow with PKCE**: Full OIDC provider compatible with MSAL.js
- **Token Signing**: RS256 JWT signing with configurable RSA keys
- **Refresh Token Rotation**: Automatic rotation on each refresh for security
- **Pluggable Token Store**: In-memory default, replaceable with database-backed stores
- **Discovery & JWKS**: Standard `.well-known/openid-configuration` and JWKS endpoints

## How It Works

The OIDC provider implements the Authorization Code flow with PKCE:

1. The OIDC client (e.g. MSAL.js) redirects to `/authorize`
2. The server validates the request and redirects to your SPA login page with an `oidc_request_id` parameter
3. The user logs in via the existing local user login flow and obtains a JWT
4. The SPA calls `/authorize/complete` with the request ID and user JWT
5. The server returns a redirect URL containing an authorization code
6. The OIDC client exchanges the code at `/token` for id_token, access_token, and refresh_token

## Getting Started

### Step 1: Generate an RSA Key

Generate an RSA private key for signing tokens:

```bash
openssl genrsa -out oidc-signing-key.pem 2048
```

### Step 2: Create Your Endpoints Class

```csharp
public class MyOidcEndpoints : OidcEndpoints
{
    public MyOidcEndpoints(OidcProviderConfig config, OidcEndpointOptions? options = null)
        : base(config, options) { }
}
```

### Step 3: Implement IOidcUserClaimsProvider

This bridges your user system with OIDC claims. Given a user JWT from your existing login flow, return the OIDC claims:

```csharp
public class MyClaimsProvider : IOidcUserClaimsProvider
{
    private readonly AppDbContext _context;

    public MyClaimsProvider(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Claim>?> GetClaimsFromUserToken(string userJwt)
    {
        // Decode and validate the JWT from your existing auth system
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(userJwt);
        var userId = token.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
        if (userId == null) return null;

        var user = await _context.Users.FindAsync(Guid.Parse(userId));
        if (user == null) return null;

        return new[]
        {
            new Claim("sub", user.Id.ToString()),
            new Claim("name", $"{user.FirstName} {user.LastName}"),
            new Claim("email", user.Email),
            new Claim("role", user.Role)
        };
    }
}
```

### Step 4: Register in Program.cs

```csharp
var oidcConfig = new OidcProviderConfig
{
    Issuer = "https://myapp.example.com/oidc",
    RsaKey = new OidcRsaKeyConfig { PemKey = builder.Configuration["Oidc:RsaPrivateKey"] },
    Clients =
    [
        new OidcClientConfig
        {
            ClientId = "my-spa",
            RedirectUris = ["https://myapp.example.com/auth/callback"],
            PostLogoutRedirectUris = ["https://myapp.example.com/"]
        }
    ],
    LoginPageUrl = "/login"
};

builder.Services.AddOidcEndpoints<MyOidcEndpoints>(oidcConfig);
builder.Services.AddScoped<IOidcUserClaimsProvider, MyClaimsProvider>();
```

### Step 5: Map the Endpoints

```csharp
app.MapOidcEndpoints<MyOidcEndpoints>("/oidc");
```

### Step 6: Configure the OIDC Client

For MSAL.js:

```typescript
const msalConfig = {
    auth: {
        clientId: "my-spa",
        authority: "https://myapp.example.com/oidc",
        protocolMode: "OIDC",
    },
};
```

## Endpoints

All endpoints are mapped under the route group prefix (e.g. `/oidc`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/openid-configuration` | OIDC discovery document |
| GET | `/.well-known/keys` | JSON Web Key Set (JWKS) |
| GET | `/authorize` | Authorization endpoint (redirects to login page) |
| POST | `/authorize/complete` | Complete authorization after SPA login |
| POST | `/token` | Token endpoint (auth code and refresh token grants) |
| GET | `/logout` | End session (optionally calls the external provider's logout, then redirects to the post-logout URI) |

## Logging Out of the External Provider

When a user signs in through an external provider (`/external/login`), the id_token issued by this
provider carries an `idp` claim naming that provider. On `/logout`, the `id_token_hint` supplied by
the client is used to read that claim and, if the provider publishes an `end_session_endpoint` in
its discovery document, the browser is redirected there before returning to the client's
`post_logout_redirect_uri`.

**No `id_token_hint` is sent to the external provider.** Without it a provider will typically ask
the user which account to sign out of, rather than silently ending an SSO session that other
applications on that machine may still be relying on. Per the RP-Initiated Logout spec, `client_id`
is sent instead, which is required when `post_logout_redirect_uri` is used without a hint.

No server-side state is stored. The client's post-logout URI and `state` are encoded into the
`state` parameter sent to the provider, which the RP-Initiated Logout spec requires the provider to
echo back when it redirects to `/external/logout/callback`. The URI is then re-validated against the
registered `PostLogoutRedirectUris` before the user is redirected on.

This relies on the provider being spec-compliant about `state`. A provider that drops it signs the
user out but leaves them at `/external/logout/callback` with no idea where to send them next; that
case logs a warning.

Set the log level for your endpoints class to `Debug` to see the outbound logout URL, which is the
quickest way to check it against what the provider has registered:

```json
"Logging": { "LogLevel": { "MyApp.MyOidcEndpoints": "Debug" } }
```

If the provider has no `end_session_endpoint`, discovery is unreachable, the `id_token_hint` is
missing or invalid, or the provider has `EnableRpInitiatedLogout = false`, logout falls back to the
purely local behaviour of redirecting straight to the client's post-logout URI.

### Provider registration

`{Issuer}/external/logout/callback` must be registered with the external provider as an allowed
post-logout redirect URI. For Entra ID (Azure AD) that means adding it to the app registration's
**redirect URI list** — not the "Front-channel logout URL" field, which is for the opposite
direction. If it isn't registered, the provider signs the user out but strands them on its own page
instead of redirecting back.

### Per-provider options

```csharp
new ExternalOidcProviderConfig
{
    Name = "microsoft",
    Authority = "https://login.microsoftonline.com/common/v2.0",
    ClientId = "...",
    EnableRpInitiatedLogout = true,               // default; false keeps logout local only
    AdditionalLogoutParams = { ["logout_hint"] = "..." },
}
```

Note that logging out does **not** revoke outstanding refresh tokens; they remain valid until they
expire.

## Customization

### Disabling Specific Endpoints

```csharp
builder.Services.AddOidcEndpoints<MyOidcEndpoints>(oidcConfig, options =>
{
    options.EnableEndSession = false;
    options.EnableExternalLogoutCallback = false;
});
```

### Custom Token Store

By default, authorization codes, refresh tokens, and authorize requests are stored in memory using `InMemoryOidcTokenStore`. For production deployments with multiple server instances, implement `IOidcTokenStore` with a database-backed store:

```csharp
public class DbOidcTokenStore : IOidcTokenStore
{
    // Implement all methods using your database
}

// Register before AddOidcEndpoints (uses TryAddSingleton)
builder.Services.AddSingleton<IOidcTokenStore, DbOidcTokenStore>();
```

### Configuration Options

`OidcProviderConfig` supports the following settings:

| Property | Default | Description |
|----------|---------|-------------|
| `Issuer` | (required) | The issuer URL, must match where endpoints are hosted |
| `RsaKey` | (required) | RSA key config (`PemKey`, `Base64Key`, optional `KeyId`) |
| `Clients` | `[]` | List of registered OIDC clients |
| `LoginPageUrl` | `"/login"` | SPA login page URL for the authorize redirect |
| `AccessTokenLifetimeSeconds` | `3600` | Access token lifetime (1 hour) |
| `IdTokenLifetimeSeconds` | `3600` | ID token lifetime (1 hour) |
| `AuthorizationCodeLifetimeSeconds` | `300` | Auth code lifetime (5 minutes) |
| `RefreshTokenLifetimeSeconds` | `86400` | Refresh token lifetime (24 hours) |

### SPA Login Page Integration

Your SPA login page needs to handle the `oidc_request_id` query parameter. After a successful login:

```typescript
// Detect OIDC flow
const params = new URLSearchParams(window.location.search);
const oidcRequestId = params.get("oidc_request_id");

if (oidcRequestId) {
    // After successful login, complete the OIDC flow
    const response = await fetch("/oidc/authorize/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            oidcRequestId,
            userToken: jwt, // JWT from the local user login
        }),
    });
    const { redirectUrl } = await response.json();
    window.location.href = redirectUrl;
}
```

## Migration from Astrolabe.LocalUsers

If you were previously using the OIDC functionality from `Astrolabe.LocalUsers`, update your references:

1. Add a reference to `Astrolabe.OIDC`
2. Change `using Astrolabe.LocalUsers.Oidc` to `using Astrolabe.OIDC`

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.OIDC)
