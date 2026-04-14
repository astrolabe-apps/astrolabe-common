using System.Security.Claims;

namespace Astrolabe.FormItems;

/// <summary>
/// Resolves the acting user from the current HTTP principal. Minimal by design —
/// consumers that already have a richer resolver (e.g. one that loads a full
/// user record) can implement both interfaces on the same class.
/// </summary>
public interface IItemUserResolver
{
    Task<ItemSecurityContext> Resolve(ClaimsPrincipal principal);
}
