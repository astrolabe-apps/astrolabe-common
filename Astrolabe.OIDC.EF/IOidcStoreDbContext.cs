using Microsoft.EntityFrameworkCore;

namespace Astrolabe.OIDC.EF;

/// <summary>
/// Interface that the consumer's DbContext must implement to provide the OidcStoreEntries table.
/// The consumer declares their own DbSet property (with any name) and returns it from this method.
/// </summary>
public interface IOidcStoreDbContext
{
    DbSet<OidcStoreEntry> GetOidcStoreEntries();
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
