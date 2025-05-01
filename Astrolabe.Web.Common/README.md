# Astrolabe.Web.Common

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.Web.Common.svg)](https://www.nuget.org/packages/Astrolabe.Web.Common/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A utility library for .NET web projects that provides tools for JWT authentication and SPA virtual hosting.

## Installation

```shell
dotnet add package Astrolabe.Web.Common
```

## Features

- JWT token generation and authentication
- SPA virtual hosting with domain-based routing
- Development mode controller filtering

## JWT Authentication

### BasicJwtToken

The `BasicJwtToken` class contains the essential parameters needed for JWT token generation and validation.

```csharp
public record BasicJwtToken(byte[] SecretKey, string Issuer, string Audience);
```

#### Properties

- `SecretKey`: The key used to sign the JWT token
- `Issuer`: The issuer of the token
- `Audience`: The intended audience of the token

### Extension Methods

#### MakeTokenSigner

Creates a function that can generate JWT tokens with the specified claims and expiration.

```csharp
public delegate string TokenGenerator(IEnumerable<Claim> claims, long expiresInSeconds);

// Usage
var tokenParams = new BasicJwtToken(secretKey, issuer, audience);
var tokenGenerator = tokenParams.MakeTokenSigner();
string token = tokenGenerator(claims, 3600); // Expires in 1 hour
```

#### ConfigureJwtBearer

Creates a configuration action for JWT bearer authentication.

```csharp
// Usage in Startup.cs
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(jwtToken.ConfigureJwtBearer());
```

## Virtual Hosting for SPAs

### UseDomainSpa

The `UseDomainSpa` extension method allows you to host multiple SPAs in a single application, with routing based on domain prefixes or path segments.

```csharp
public static IApplicationBuilder UseDomainSpa(
    this IApplicationBuilder app,
    IWebHostEnvironment env,
    string siteDir,
    string? domainPrefix = null,
    bool fallback = false,
    DomainSpaOptions? options = null,
    Func<HttpRequest, bool>? match = null,
    PathString? pathString = null
)
```

#### Parameters

- `app`: The application builder
- `env`: The web host environment
- `siteDir`: The directory name containing the SPA's output files (relative to `ClientApp/sites`)
- `domainPrefix`: The domain prefix to match (defaults to `siteDir + "."`)
- `fallback`: If true, the SPA will be used as a fallback for all requests
- `options`: Additional options for the SPA hosting
- `match`: A custom function to match requests
- `pathString`: A path string to match against instead of domain-based matching

#### Usage

```csharp
// Match requests to admin.example.com
app.UseDomainSpa(env, "admin");

// Match requests to /dashboard
app.UseDomainSpa(
    env, 
    "dashboard", 
    domainPrefix: null, 
    pathString: "/dashboard"
);

// Custom matching function
app.UseDomainSpa(
    env, 
    "special", 
    match: req => req.Headers["X-Special"].Any()
);
```

### DomainSpaOptions

Options for SPA hosting.

```csharp
public class DomainSpaOptions
{
    public string CacheControl { get; set; } = "private, max-age=30, must-revalidate";
}
```

#### Properties

- `CacheControl`: The Cache-Control header value for static files

### HtmlFileProvider

The `HtmlFileProvider` is used internally to provide HTML files for the SPA. It has special handling for dynamic routes, where file paths with segments like `[id]` are matched against the request path.

## Development Mode Features

### DevModeAttribute

Mark controllers that should only be available in development mode.

```csharp
[DevMode]
public class DevToolsController : Controller
{
    // This controller will be hidden in production
}
```

### HideDevModeControllersConvention

A convention that removes controllers marked with `DevModeAttribute` from the application model.

#### Usage

```csharp
// In Startup.cs
services.AddControllers(options =>
{
    if (!env.IsDevelopment())
    {
        options.Conventions.Add(new HideDevModeControllersConvention());
    }
});
```

## Full Example

```csharp
// Program.cs
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Setup JWT authentication
var jwtSecretKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]);
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
var jwtToken = new BasicJwtToken(jwtSecretKey, jwtIssuer, jwtAudience);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(jwtToken.ConfigureJwtBearer());

// Add controllers but hide dev mode controllers in production
builder.Services.AddControllers(options =>
{
    if (!builder.Environment.IsDevelopment())
    {
        options.Conventions.Add(new HideDevModeControllersConvention());
    }
});

var app = builder.Build();

// Configure virtual hosting for SPAs
app.UseDomainSpa(app.Environment, "main", fallback: true);
app.UseDomainSpa(app.Environment, "admin");
app.UseDomainSpa(app.Environment, "dashboard", pathString: "/dashboard");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

## License

MIT