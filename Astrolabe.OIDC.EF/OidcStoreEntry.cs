using System.ComponentModel.DataAnnotations;

namespace Astrolabe.OIDC.EF;

/// <summary>
/// Single table entity for all OIDC token store entries (auth codes, refresh tokens, authorize requests, external auth state).
/// </summary>
public class OidcStoreEntry
{
    [Key]
    [MaxLength(256)]
    public required string Key { get; set; }

    [Required]
    [MaxLength(20)]
    public required string Type { get; set; }

    [Required]
    public required string Data { get; set; }

    public required DateTimeOffset ExpiresAt { get; set; }
}
