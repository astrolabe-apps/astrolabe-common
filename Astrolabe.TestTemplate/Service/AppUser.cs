using System.ComponentModel.DataAnnotations;

namespace Astrolabe.TestTemplate.Service;

public class AppUser
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = "";

    [Required]
    public string PasswordHash { get; set; } = "";

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = "";

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = "";

    public bool IsVerified { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
