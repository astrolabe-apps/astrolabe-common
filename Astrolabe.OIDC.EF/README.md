# Astrolabe.OIDC.EF

Entity Framework Core implementation of `IOidcTokenStore` for [Astrolabe.OIDC](../Astrolabe.OIDC). Stores authorization codes, refresh tokens, authorize requests, and external auth state in a single database table with JSON-serialized data.

## Setup

### 1. Implement `IOidcStoreDbContext` on your DbContext

```csharp
using Astrolabe.OIDC.EF;

public class AppDbContext : DbContext, IOidcStoreDbContext
{
    public DbSet<OidcStoreEntry> OidcTokens { get; set; }

    public DbSet<OidcStoreEntry> GetOidcStoreEntries() => OidcTokens;
}
```

The `DbSet` property name controls the table name (e.g. `OidcTokens` creates a table called `OidcTokens`).

### 2. Register the store before `AddOidcEndpoints`

```csharp
builder.Services.AddEfOidcTokenStore<AppDbContext>();
builder.Services.AddOidcEndpoints<MyOidcEndpoints>(oidcConfig);
```

`AddEfOidcTokenStore` must be called **before** `AddOidcEndpoints`, which registers the default in-memory store via `TryAddSingleton`.

### 3. Add a migration

```bash
dotnet ef migrations add AddOidcStoreEntries
```

## Table Schema

All four stored types share one table:

| Column    | Type              | Description                                              |
|-----------|-------------------|----------------------------------------------------------|
| Key       | string (PK, 256)  | Lookup key (code, token value, request ID, state value)  |
| Type      | string (20)       | Discriminator: `AuthCode`, `RefreshToken`, `AuthRequest`, `ExternalAuth` |
| Data      | string (max)      | JSON-serialized payload                                  |
| ExpiresAt | DateTimeOffset    | Expiry timestamp                                         |

## Cleanup

Expired entries are not automatically purged. Call `CleanupExpired()` periodically (e.g. via a background service):

```csharp
var store = serviceProvider.GetRequiredService<IOidcTokenStore>();
if (store is EntityFrameworkOidcTokenStore<AppDbContext> efStore)
{
    await efStore.CleanupExpired();
}
```