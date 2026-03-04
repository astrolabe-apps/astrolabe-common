using System.Security.Claims;
using Astrolabe.OIDC;
using Astrolabe.TestTemplate.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Service;

public class TestExternalUserLinker(AppDbContext db) : IExternalUserLinker
{
    public async Task<IEnumerable<Claim>?> LinkExternalUser(string providerName, IEnumerable<Claim> externalClaims)
    {
        var claimsList = externalClaims.ToList();

        // Extract email from external claims (different providers use different claim types)
        var email = claimsList.FirstOrDefault(c => c.Type == "email")?.Value
            ?? claimsList.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
            ?? claimsList.FirstOrDefault(c => c.Type == "preferred_username")?.Value;

        if (string.IsNullOrEmpty(email))
            return null;

        // Find or create local user by email
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            // Auto-create a new user from external identity
            var name = claimsList.FirstOrDefault(c => c.Type == "name")?.Value
                ?? claimsList.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value
                ?? email;

            var nameParts = name.Split(' ', 2);
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                PasswordHash = "", // External users don't have local passwords
                FirstName = nameParts[0],
                LastName = nameParts.Length > 1 ? nameParts[1] : "",
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        // Return local OIDC claims
        return
        [
            new Claim("sub", user.Id.ToString()),
            new Claim("name", $"{user.FirstName} {user.LastName}".Trim()),
            new Claim("email", user.Email)
        ];
    }
}
