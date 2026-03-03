# Astrolabe.LocalUsers

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.LocalUsers.svg)](https://www.nuget.org/packages/Astrolabe.LocalUsers/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive library for implementing local user management in .NET 8+ applications using Minimal APIs. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.LocalUsers provides abstractions and base classes for implementing robust user management, including:

- Account creation with email verification
- Secure password authentication
- Multi-factor authentication (MFA) via SMS/phone
- Password reset functionality
- User profile management (email and MFA number changes)
- OpenID Connect (OIDC) provider for use with MSAL.js and other OIDC clients

## Installation

```bash
dotnet add package Astrolabe.LocalUsers
```

## Features

### User Management

- **Account Creation**: Create new user accounts with email verification
- **Authentication**: Authenticate users with username/password
- **Multi-Factor Authentication**: MFA support using verification codes
- **Password Management**: Change and reset password flows
- **Profile Management**: Update email and MFA phone number

### OIDC Provider

- **Authorization Code Flow with PKCE**: Full OIDC provider compatible with MSAL.js
- **Token Signing**: RS256 JWT signing with configurable RSA keys
- **Refresh Token Rotation**: Automatic rotation on each refresh for security
- **Pluggable Token Store**: In-memory default, replaceable with database-backed stores
- **Discovery & JWKS**: Standard `.well-known/openid-configuration` and JWKS endpoints

### Security Features

- **Password Hashing**: Secure password storage with salted SHA-256 hashing (customizable)
- **Validation**: Comprehensive validation for user inputs using FluentValidation
- **MFA Support**: Two-factor authentication with verification codes

## Getting Started

### Step 1: Define Your User Model

Create a class that implements `ICreateNewUser`:

```csharp
public class CreateUserRequest : ICreateNewUser
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string Confirm { get; set; }

    // Additional properties as needed
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string MobileNumber { get; set; }
}
```

### Step 2: Implement a User Service

Extend the `AbstractLocalUserService<TNewUser, TUserId>` class:

```csharp
public class MyUserService : AbstractLocalUserService<CreateUserRequest, Guid>
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public MyUserService(
        IPasswordHasher passwordHasher,
        AppDbContext context,
        IEmailService emailService,
        LocalUserMessages? messages = null)
        : base(passwordHasher, messages)
    {
        _context = context;
        _emailService = emailService;
    }

    // Implement abstract methods (see implementation section below)
}
```

### Step 3: Implement a User ID Provider

Create a class that extracts the user ID from the HTTP context:

```csharp
public class ClaimsUserIdProvider : ILocalUserIdProvider<Guid>
{
    public Guid GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null)
            throw new UnauthorizedException("User not authenticated");
        return Guid.Parse(claim.Value);
    }
}
```

### Step 4: Create Your Endpoints Class

Extend the `LocalUserEndpoints<TNewUser, TUserId>` class:

```csharp
public class MyUserEndpoints : LocalUserEndpoints<CreateUserRequest, Guid>
{
    public MyUserEndpoints(
        ILocalUserIdProvider<Guid> userIdProvider,
        LocalUserEndpointOptions? options = null)
        : base(userIdProvider, options) { }
}
```

### Step 5: Register Services in Program.cs

```csharp
// Register the password hasher
builder.Services.AddSingleton<IPasswordHasher, SaltedSha256PasswordHasher>();

// Register your user service
builder.Services.AddScoped<ILocalUserService<CreateUserRequest, Guid>, MyUserService>();

// Register the user ID provider
builder.Services.AddScoped<ILocalUserIdProvider<Guid>, ClaimsUserIdProvider>();

// Register the endpoints
builder.Services.AddLocalUserEndpoints<MyUserEndpoints, CreateUserRequest, Guid>();
```

### Step 6: Map the Endpoints

```csharp
// Map endpoints with a route prefix
app.MapLocalUserEndpoints<MyUserEndpoints, CreateUserRequest, Guid>("api/auth");
```

Or with additional configuration:

```csharp
app.MapGroup("api/auth")
   .MapLocalUserEndpoints<MyUserEndpoints, CreateUserRequest, Guid>()
   .WithTags("Authentication");
```

## Implementation Guide

### Implementing AbstractLocalUserService

You must implement these abstract methods:

```csharp
// Send verification email with code
protected abstract Task SendVerificationEmail(TNewUser newUser, string verificationCode);

// Create unverified account in your database
protected abstract Task CreateUnverifiedAccount(TNewUser newUser, string hashedPassword, string verificationCode);

// Count existing users with the same email
protected abstract Task<int> CountExistingForEmail(string email);

// Verify email with code and return JWT token (or MFA token if MFA required)
protected abstract Task<string?> VerifyAccountCode(string code);

// MFA verification for account creation
protected abstract Task<string?> VerifyAccountWithMfaForUserId(MfaAuthenticateRequest mfaAuthenticateRequest);

// Authenticate with username/password and return JWT token (or MFA token)
protected abstract Task<string?> AuthenticatedHashed(AuthenticateRequest authenticateRequest, string hashedPassword);

// Send an MFA code via SMS/phone
protected abstract Task<bool> SendCode(MfaCodeRequest mfaCodeRequest);
protected abstract Task<bool> SendCode(TUserId userId, string? number = null);

// Verify MFA code and return JWT token
protected abstract Task<string?> VerifyMfaCode(string token, string code, string? number);
protected abstract Task<bool> VerifyMfaCode(TUserId userId, string code, string? number);

// Set reset code for password reset
protected abstract Task SetResetCodeAndEmail(string email, string resetCode);

// Change email for a user
protected abstract Task<bool> EmailChangeForUserId(TUserId userId, string hashedPassword, string newEmail);

// Change password
protected abstract Task<(bool, Func<string, Task<string>>?)> PasswordChangeForUserId(TUserId userId, string hashedPassword);
protected abstract Task<Func<string, Task>?> PasswordResetForResetCode(string resetCode);

// Change MFA phone number
protected abstract Task<bool> ChangeMfaNumberForUserId(TUserId userId, string hashedPassword, string newNumber);
```

## Customization

### Disabling Specific Endpoints

Use `LocalUserEndpointOptions` to disable endpoints you don't need:

```csharp
builder.Services.AddLocalUserEndpoints<MyUserEndpoints, CreateUserRequest, Guid>(options =>
{
    options.EnableSendMfaCodeToNumber = false;
    options.EnableInitiateMfaNumberChange = false;
    options.EnableCompleteMfaNumberChange = false;
});
```

### Customizing Endpoint Routes

Override the mapping methods in your endpoints class:

```csharp
public class MyUserEndpoints : LocalUserEndpoints<CreateUserRequest, Guid>
{
    // Change the route path
    protected override RouteHandlerBuilder MapCreateAccount(RouteGroupBuilder group) =>
        group
            .MapPost("register", (CreateUserRequest newUser, HttpContext context) => HandleCreateAccount(newUser, context))
            .WithName("RegisterUser");

    // Add custom authorization policy
    protected override RouteHandlerBuilder MapChangePassword(RouteGroupBuilder group) =>
        base.MapChangePassword(group)
            .RequireAuthorization("MustBeVerified");
}
```

### Customizing Handler Logic

Override handler methods to add custom logic:

```csharp
public class MyUserEndpoints : LocalUserEndpoints<CreateUserRequest, Guid>
{
    private readonly ILogger<MyUserEndpoints> _logger;

    public MyUserEndpoints(
        ILocalUserIdProvider<Guid> userIdProvider,
        ILogger<MyUserEndpoints> logger,
        LocalUserEndpointOptions? options = null)
        : base(userIdProvider, options)
    {
        _logger = logger;
    }

    protected override async Task HandleCreateAccount(CreateUserRequest newUser, HttpContext context)
    {
        _logger.LogInformation("Creating account for {Email}", newUser.Email);
        await base.HandleCreateAccount(newUser, context);
        _logger.LogInformation("Account created successfully for {Email}", newUser.Email);
    }
}
```

### Custom Password Requirements

Override the `ApplyPasswordRules` method in your service implementation:

```csharp
protected override void ApplyPasswordRules<T>(AbstractValidator<T> validator)
    where T : IPasswordHolder
{
    validator.RuleFor(x => x.Password)
        .MinimumLength(10)
        .WithMessage("Password must be at least 10 characters")
        .Matches(@"[A-Z]+")
        .WithMessage("Password must contain an uppercase letter")
        .Matches(@"[0-9]+")
        .WithMessage("Password must contain a number");
}
```

### Custom Error Messages

Provide a custom `LocalUserMessages` instance:

```csharp
var messages = new LocalUserMessages
{
    AccountExists = "This email is already registered",
    PasswordMismatch = "Passwords do not match",
    PasswordWrong = "The password you entered is incorrect",
    EmailInvalid = "Please enter a valid email address"
};

builder.Services.AddSingleton(messages);
```

### Custom Email Validation Rules

Override the `ApplyCreationRules` method:

```csharp
protected override Task ApplyCreationRules(CreateUserRequest user, AbstractValidator<CreateUserRequest> validator)
{
    validator.RuleFor(x => x.Email)
        .Must(x => x.EndsWith("@mycompany.com"))
        .WithMessage("Only company email addresses are allowed");

    return Task.CompletedTask;
}
```

## Secure Password Storage

The library includes a `SaltedSha256PasswordHasher` implementation, but you can create your own by implementing the `IPasswordHasher` interface:

```csharp
public class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
```

## API Endpoints

The endpoints are organized by resource with sensible OpenAPI operation IDs:

### Account Management (`account/*`)

| Method | Path | Operation ID | Auth Required | Description |
|--------|------|--------------|---------------|-------------|
| POST | `/account` | CreateAccount | No | Create a new account |
| POST | `/account/verify` | VerifyAccount | No | Verify account with email code |
| POST | `/account/verify/mfa` | VerifyAccountWithMfa | No | Complete verification with MFA |
| POST | `/account/email` | ChangeEmail | Yes | Change email address |
| POST | `/account/password` | ChangePassword | Yes | Change password |
| POST | `/account/mfa-number` | InitiateMfaNumberChange | No | Start MFA number change |
| POST | `/account/mfa-number/complete` | CompleteMfaNumberChange | Yes | Complete MFA number change |
| POST | `/account/mfa-number/send-code` | SendMfaCodeToNumber | No | Send MFA code to number |

### Authentication (`auth/*`)

| Method | Path | Operation ID | Auth Required | Description |
|--------|------|--------------|---------------|-------------|
| POST | `/auth` | Authenticate | No | Authenticate with credentials |
| POST | `/auth/mfa/send` | SendAuthenticationMfaCode | No | Send MFA code for auth |
| POST | `/auth/mfa/complete` | CompleteAuthentication | No | Complete MFA authentication |

### Password Reset (`password/*`)

| Method | Path | Operation ID | Auth Required | Description |
|--------|------|--------------|---------------|-------------|
| POST | `/password/forgot` | ForgotPassword | No | Initiate password reset |
| POST | `/password/reset` | ResetPassword | No | Reset password with code |

## OIDC Provider

Astrolabe.LocalUsers includes an OpenID Connect provider that allows your application to act as an OIDC identity provider. This enables SPAs using MSAL.js (or any OIDC-compliant client) to authenticate against your local user system instead of an external identity provider like Azure AD.

### How It Works

The OIDC provider implements the Authorization Code flow with PKCE:

1. The OIDC client (e.g. MSAL.js) redirects to `/authorize`
2. The server validates the request and redirects to your SPA login page with an `oidc_request_id` parameter
3. The user logs in via the existing local user login flow and obtains a JWT
4. The SPA calls `/authorize/complete` with the request ID and user JWT
5. The server returns a redirect URL containing an authorization code
6. The OIDC client exchanges the code at `/token` for id_token, access_token, and refresh_token

### Setup

#### Step 1: Generate an RSA Key

Generate an RSA private key for signing tokens:

```bash
openssl genrsa -out oidc-signing-key.pem 2048
```

#### Step 2: Create Your Endpoints Class

```csharp
public class MyOidcEndpoints : OidcEndpoints
{
    public MyOidcEndpoints(OidcProviderConfig config, OidcEndpointOptions? options = null)
        : base(config, options) { }
}
```

#### Step 3: Implement IOidcUserClaimsProvider

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

#### Step 4: Register in Program.cs

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

#### Step 5: Map the Endpoints

```csharp
app.MapOidcEndpoints<MyOidcEndpoints>("/oidc");
```

#### Step 6: Configure the OIDC Client

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

### OIDC Endpoints

All endpoints are mapped under the route group prefix (e.g. `/oidc`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/openid-configuration` | OIDC discovery document |
| GET | `/.well-known/keys` | JSON Web Key Set (JWKS) |
| GET | `/authorize` | Authorization endpoint (redirects to login page) |
| POST | `/authorize/complete` | Complete authorization after SPA login |
| POST | `/token` | Token endpoint (auth code and refresh token grants) |
| GET | `/logout` | End session (redirects to post-logout URI) |

### Disabling Specific OIDC Endpoints

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

## Migration Guide (v4.x to v5.x)

This version introduces breaking changes to improve API clarity and migrate from MVC controllers to Minimal APIs.

### Breaking Changes

#### 1. AbstractLocalUserController Removed

The `AbstractLocalUserController<TNewUser, TUserId>` class has been removed. Replace it with the new `LocalUserEndpoints<TNewUser, TUserId>` class and Minimal APIs approach.

**Before (v4.x):**
```csharp
[ApiController]
[Route("api/users")]
public class UserController : AbstractLocalUserController<NewUser, Guid>
{
    public UserController(ILocalUserService<NewUser, Guid> userService)
        : base(userService) { }

    protected override Guid GetUserId() =>
        Guid.Parse(User.FindFirst("userId")?.Value ?? "");
}
```

**After (v4.x):**
```csharp
// 1. Create a user ID provider
public class ClaimsUserIdProvider : ILocalUserIdProvider<Guid>
{
    public Guid GetUserId(HttpContext context) =>
        Guid.Parse(context.User.FindFirst("userId")?.Value ?? "");
}

// 2. Create an endpoints class
public class UserEndpoints : LocalUserEndpoints<NewUser, Guid>
{
    public UserEndpoints(
        ILocalUserIdProvider<Guid> userIdProvider,
        LocalUserEndpointOptions? options = null)
        : base(userIdProvider, options) { }
}

// 3. Register in Program.cs
builder.Services.AddScoped<ILocalUserIdProvider<Guid>, ClaimsUserIdProvider>();
builder.Services.AddLocalUserEndpoints<UserEndpoints, NewUser, Guid>();

// 4. Map endpoints
app.MapLocalUserEndpoints<UserEndpoints, NewUser, Guid>("api/users");
```

#### 2. ILocalUserService Method Renames

The following methods have been renamed for clarity:

| Old Name (v4.x)               | New Name (v5.x)             | Description |
|-------------------------------|-----------------------------|-------------|
| `MfaVerifyAccount`            | `VerifyAccountWithMfa`      | Complete account verification with MFA |
| `SendMfaCode(MfaCodeRequest)` | `SendAuthenticationMfaCode` | Send MFA code during authentication |
| `MfaAuthenticate`             | `CompleteAuthentication`    | Complete MFA authentication flow |
| `ChangeMfaNumber`             | `InitiateMfaNumberChange`   | Start MFA number change process |
| `MfaChangeMfaNumber`          | `CompleteMfaNumberChange`   | Complete MFA number change with code |
| `SendMfaCode(string, Func)`   | `SendMfaCodeToNumber`       | Send MFA code to specific number |

#### 3. AbstractLocalUserService Abstract Method Rename

If you extend `AbstractLocalUserService`, rename this method:

| Old Name (v4.x)             | New Name (v5.x)                 |
|-----------------------------|---------------------------------|
| `MfaVerifyAccountForUserId` | `VerifyAccountWithMfaForUserId` |

**Before:**
```csharp
protected override Task<string?> MfaVerifyAccountForUserId(
    MfaAuthenticateRequest mfaAuthenticateRequest)
{
    // ...
}
```

**After:**
```csharp
protected override Task<string?> VerifyAccountWithMfaForUserId(
    MfaAuthenticateRequest mfaAuthenticateRequest)
{
    // ...
}
```

#### 4. API Route Changes

The default API routes have changed to be more RESTful:

| Old Route (v3.x) | New Route (v4.x) |
|------------------|------------------|
| `/create` | `/account` |
| `/verify` | `/account/verify` |
| `/mfaVerify` | `/account/verify/mfa` |
| `/authenticate` | `/auth` |
| `/mfaCode/authenticate` | `/auth/mfa/send` |
| `/mfaAuthenticate` | `/auth/mfa/complete` |
| `/forgotPassword` | `/password/forgot` |
| `/resetPassword` | `/password/reset` |
| `/changeEmail` | `/account/email` |
| `/changePassword` | `/account/password` |
| `/changeMfaNumber` | `/account/mfa-number` |
| `/mfaChangeMfaNumber` | `/account/mfa-number/complete` |
| `/mfaCode/number` | `/account/mfa-number/send-code` |

If you need to maintain backwards compatibility with existing clients, override the mapping methods to use the old routes:

```csharp
public class UserEndpoints : LocalUserEndpoints<NewUser, Guid>
{
    protected override RouteHandlerBuilder MapCreateAccount(RouteGroupBuilder group) =>
        group.MapPost("create", (NewUser newUser, HttpContext context) => HandleCreateAccount(newUser, context))
            .WithName("CreateAccount");

    // Override other methods as needed...
}
```

#### 5. Target Framework

The library now targets .NET 8.0 (previously .NET 7.0).

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.LocalUsers)
- [Documentation](https://github.com/astrolabe-apps/astrolabe-common/tree/main/Astrolabe.LocalUsers)