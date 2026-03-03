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
| GET | `/logout` | End session (redirects to post-logout URI) |

## Customization

### Disabling Specific Endpoints

```csharp
builder.Services.AddOidcEndpoints<MyOidcEndpoints>(oidcConfig, options =>
{
    options.EnableEndSession = false;
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
