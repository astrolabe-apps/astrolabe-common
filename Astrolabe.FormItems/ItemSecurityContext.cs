namespace Astrolabe.FormItems;

/// <summary>
/// The caller's identity for authorisation decisions: who is acting and what
/// roles they hold.
/// </summary>
public record ItemSecurityContext(Guid UserId, IList<string> Roles);
