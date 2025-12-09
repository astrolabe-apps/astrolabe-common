---
name: astrolabe-web-common
description: ASP.NET Core utilities for JWT authentication and SPA hosting with domain-based routing. Use when building web apps needing JWT tokens, multi-SPA hosting, or development-mode controller filtering.
---

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

## Project Structure Location

- **Path**: `Astrolabe.Web.Common/`
- **Project File**: `Astrolabe.Web.Common.csproj`
- **Namespace**: `Astrolabe.Web.Common`
