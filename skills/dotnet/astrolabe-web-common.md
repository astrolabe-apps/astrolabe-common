# Astrolabe.Web.Common - JWT & SPA Hosting

## Overview

Astrolabe.Web.Common provides utilities for .NET web projects, focusing on JWT authentication and SPA (Single Page Application) virtual hosting with domain-based routing.

**When to use**: Use this library when building ASP.NET Core applications that need JWT token authentication, multi-SPA hosting, or development-mode controller filtering.

**Package**: `Astrolabe.Web.Common`
**Dependencies**: ASP.NET Core, Microsoft.AspNetCore.Authentication.JwtBearer
**Target Framework**: .NET 7-8

## Key Concepts

### 1. JWT Authentication

Simplified JWT token generation and validation using `BasicJwtToken` and extension methods that configure ASP.NET Core authentication.

### 2. Virtual SPA Hosting

Host multiple Single Page Applications in one ASP.NET Core app with intelligent routing based on:
- Domain prefixes (e.g., admin.example.com, app.example.com)
- Path segments (e.g., /admin, /dashboard)
- Custom request matching logic

### 3. Development Mode Controllers

Mark controllers that should only be available during development using `[DevMode]` attribute, automatically hidden in production.

## Common Patterns

### Setting Up JWT Authentication

```csharp
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Create JWT token parameters
var jwtSecretKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? throw new Exception("JWT secret key not configured"));
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MyApp";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MyApp";

var jwtToken = new BasicJwtToken(jwtSecretKey, jwtIssuer, jwtAudience);

// 2. Configure authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(jwtToken.ConfigureJwtBearer());

builder.Services.AddAuthorization();

var app = builder.Build();

// 3. Use authentication middleware
app.UseAuthentication();
app.UseAuthorization();

app.Run();
```

### Generating JWT Tokens

```csharp
using Astrolabe.Web.Common;
using System.Security.Claims;

// Create token generator
var jwtToken = new BasicJwtToken(secretKey, issuer, audience);
var tokenGenerator = jwtToken.MakeTokenSigner();

// Generate token with claims
var claims = new[]
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(ClaimTypes.Name, user.Email),
    new Claim(ClaimTypes.Role, user.Role)
};

// Token expires in 1 hour (3600 seconds)
string token = tokenGenerator(claims, 3600);

// Return to client
return Ok(new { Token = token });
```

### Hosting Multiple SPAs by Domain

```csharp
using Astrolabe.Web.Common;

var app = builder.Build();

// Main app at example.com
app.UseDomainSpa(app.Environment, "main", fallback: true);

// Admin panel at admin.example.com
app.UseDomainSpa(app.Environment, "admin");

// Dashboard at dashboard.example.com
app.UseDomainSpa(app.Environment, "dashboard");

app.Run();
```

**Directory Structure:**
```
ClientApp/
└── sites/
    ├── main/         # Main SPA files
    ├── admin/        # Admin SPA files
    └── dashboard/    # Dashboard SPA files
```

### Hosting SPAs by Path Segment

```csharp
using Astrolabe.Web.Common;

var app = builder.Build();

// Dashboard at /dashboard
app.UseDomainSpa(
    app.Environment,
    "dashboard",
    domainPrefix: null,
    pathString: "/dashboard"
);

// Admin at /admin
app.UseDomainSpa(
    app.Environment,
    "admin",
    domainPrefix: null,
    pathString: "/admin"
);

// Main app as fallback
app.UseDomainSpa(app.Environment, "main", fallback: true);

app.Run();
```

### Custom SPA Matching Logic

```csharp
using Astrolabe.Web.Common;

var app = builder.Build();

// Match based on custom header
app.UseDomainSpa(
    app.Environment,
    "special",
    match: req => req.Headers["X-App-Type"].Contains("special")
);

// Match based on query parameter
app.UseDomainSpa(
    app.Environment,
    "beta",
    match: req => req.Query.ContainsKey("beta")
);

app.Run();
```

### Configuring SPA Options

```csharp
using Astrolabe.Web.Common;

var spaOptions = new DomainSpaOptions
{
    CacheControl = "public, max-age=3600" // Cache static files for 1 hour
};

app.UseDomainSpa(
    app.Environment,
    "admin",
    options: spaOptions
);
```

### Development-Only Controllers

```csharp
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Mvc;

// This controller is only available in development mode
[DevMode]
[ApiController]
[Route("api/dev")]
public class DevToolsController : ControllerBase
{
    [HttpGet("clear-cache")]
    public IActionResult ClearCache()
    {
        // Development-only endpoint
        return Ok("Cache cleared");
    }

    [HttpGet("seed-data")]
    public async Task<IActionResult> SeedTestData()
    {
        // Seed test data for development
        return Ok("Data seeded");
    }
}
```

### Hiding Dev Controllers in Production

```csharp
using Astrolabe.Web.Common;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    // Hide controllers marked with [DevMode] in production
    if (!builder.Environment.IsDevelopment())
    {
        options.Conventions.Add(new HideDevModeControllersConvention());
    }
});

var app = builder.Build();
app.Run();
```

## Complete Example

```csharp
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// JWT Configuration
var jwtSecretKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!);
var jwtToken = new BasicJwtToken(
    jwtSecretKey,
    builder.Configuration["Jwt:Issuer"]!,
    builder.Configuration["Jwt:Audience"]!
);

// Services
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(jwtToken.ConfigureJwtBearer());

builder.Services.AddAuthorization();

builder.Services.AddControllers(options =>
{
    if (!builder.Environment.IsDevelopment())
    {
        options.Conventions.Add(new HideDevModeControllersConvention());
    }
});

// Add token generator as singleton
builder.Services.AddSingleton(jwtToken.MakeTokenSigner());

var app = builder.Build();

// SPA Hosting
app.UseDomainSpa(app.Environment, "admin");
app.UseDomainSpa(app.Environment, "dashboard", pathString: "/dashboard");
app.UseDomainSpa(app.Environment, "main", fallback: true);

// Middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Example authenticated controller
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Ok(new { UserId = userId });
    }
}

// Example login controller
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TokenGenerator _tokenGenerator;

    public AuthController(TokenGenerator tokenGenerator)
    {
        _tokenGenerator = tokenGenerator;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Validate credentials (simplified)
        if (request.Username == "admin" && request.Password == "password")
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1"),
                new Claim(ClaimTypes.Name, request.Username),
                new Claim(ClaimTypes.Role, "Admin")
            };

            var token = _tokenGenerator(claims, 3600); // 1 hour
            return Ok(new { Token = token });
        }

        return Unauthorized();
    }
}

public record LoginRequest(string Username, string Password);
```

## Best Practices

### 1. Secure Secret Key Storage

```csharp
// ✅ DO - Store secret keys in configuration/secrets
var secretKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!);

// ❌ DON'T - Hardcode secret keys
var secretKey = Encoding.UTF8.GetBytes("my-secret-key-123");
```

### 2. Use Appropriate Token Expiration

```csharp
// ✅ DO - Set reasonable expiration times
var token = tokenGenerator(claims, 3600);      // 1 hour for web
var refreshToken = tokenGenerator(claims, 604800); // 7 days for refresh

// ❌ DON'T - Use excessively long or short expirations
var token = tokenGenerator(claims, 31536000); // 1 year - too long
var token = tokenGenerator(claims, 60);       // 1 minute - too short
```

### 3. Order SPA Middleware Correctly

```csharp
// ✅ DO - Most specific routes first, fallback last
app.UseDomainSpa(app.Environment, "admin");
app.UseDomainSpa(app.Environment, "dashboard", pathString: "/dashboard");
app.UseDomainSpa(app.Environment, "main", fallback: true); // Last!

// ❌ DON'T - Put fallback first (it will catch everything)
app.UseDomainSpa(app.Environment, "main", fallback: true);
app.UseDomainSpa(app.Environment, "admin"); // Never reached!
```

### 4. Use Development Mode Controllers Wisely

```csharp
// ✅ DO - Use for debugging and development tools
[DevMode]
public class DevToolsController : ControllerBase { }

// ❌ DON'T - Use for features that should be in production with authorization
[DevMode] // Wrong! Should use [Authorize] instead
public class AdminController : ControllerBase { }
```

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized on all requests**
- **Cause**: JWT authentication middleware not configured or in wrong order
- **Solution**: Ensure `app.UseAuthentication()` comes before `app.UseAuthorization()` and before `app.MapControllers()`

**Issue: SPA not loading / 404 errors**
- **Cause**: SPA directory doesn't exist or wrong path
- **Solution**: Verify `ClientApp/sites/{siteDir}` exists and contains built SPA files

**Issue: All requests going to wrong SPA**
- **Cause**: Fallback SPA middleware registered before specific SPAs
- **Solution**: Register specific SPAs first, fallback last

**Issue: JWT tokens invalid across restarts**
- **Cause**: Secret key changes between restarts
- **Solution**: Store secret key in persistent configuration (appsettings.json, environment variables, or secrets manager)

**Issue: Dev controllers still visible in production**
- **Cause**: `HideDevModeControllersConvention` not registered
- **Solution**: Add convention in controller configuration:
  ```csharp
  builder.Services.AddControllers(options =>
  {
      if (!builder.Environment.IsDevelopment())
      {
          options.Conventions.Add(new HideDevModeControllersConvention());
      }
  });
  ```

**Issue: CORS errors when calling API from SPA**
- **Cause**: CORS not configured for SPA domains
- **Solution**: Add CORS policy before authentication:
  ```csharp
  builder.Services.AddCors(options =>
  {
      options.AddPolicy("SpaPolicy", builder =>
      {
          builder.WithOrigins("https://admin.example.com")
                 .AllowAnyHeader()
                 .AllowAnyMethod()
                 .AllowCredentials();
      });
  });

  app.UseCors("SpaPolicy");
  app.UseAuthentication();
  ```

## Project Structure Location

- **Path**: `Astrolabe.Web.Common/`
- **Project File**: `Astrolabe.Web.Common.csproj`
- **Namespace**: `Astrolabe.Web.Common`
- **NuGet**: https://www.nuget.org/packages/Astrolabe.Web.Common/

## Related Documentation

- [Astrolabe.LocalUsers](./astrolabe-local-users.md) - User authentication implementation
- [Astrolabe.Common](./astrolabe-common.md) - Base utilities
- [Microsoft JWT Bearer Authentication](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/)
