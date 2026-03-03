using System.Security.Claims;
using Astrolabe.LocalUsers;
using Astrolabe.TestTemplate.Workflow;
using Astrolabe.Web.Common;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Service;

public class TestLocalUserService(
    IPasswordHasher passwordHasher,
    AppDbContext context,
    BasicJwtToken jwtToken
) : AbstractLocalUserService<CreateAccountRequest, Guid>(passwordHasher, null)
{
    private readonly TokenGenerator _tokenGenerator = jwtToken.MakeTokenSigner();

    protected override async Task CreateUnverifiedAccount(
        CreateAccountRequest newUser,
        string hashedPassword,
        string verificationCode
    )
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = newUser.Email,
            PasswordHash = hashedPassword,
            FirstName = newUser.FirstName,
            LastName = newUser.LastName,
            IsVerified = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
    }

    protected override Task SendVerificationEmail(
        CreateAccountRequest newUser,
        string verificationCode
    )
    {
        // No-op: auto-verified in demo
        return Task.CompletedTask;
    }

    protected override async Task<string?> AuthenticatedHashed(
        AuthenticateRequest authenticateRequest,
        string hashedPassword
    )
    {
        var user = await context.Users.FirstOrDefaultAsync(u =>
            u.Email == authenticateRequest.Username && u.PasswordHash == hashedPassword
        );
        if (user == null)
            return null;
        return GenerateToken(user);
    }

    protected override async Task<int> CountExistingForEmail(string email)
    {
        return await context.Users.CountAsync(u => u.Email == email);
    }

    private string GenerateToken(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new(ClaimTypes.Email, user.Email)
        };
        return _tokenGenerator(claims, 3600);
    }

    // Stubs for unsupported features

    protected override Task<string?> VerifyAccountCode(string code) =>
        throw new NotSupportedException();

    protected override Task<string?> VerifyAccountWithMfaForUserId(
        MfaAuthenticateRequest mfaAuthenticateRequest
    ) => throw new NotSupportedException();

    protected override Task<bool> SendCode(MfaCodeRequest mfaCodeRequest) =>
        throw new NotSupportedException();

    protected override Task<bool> SendCode(Guid userId, string? number = null) =>
        throw new NotSupportedException();

    protected override Task<string?> VerifyMfaCode(string token, string code, string? number) =>
        throw new NotSupportedException();

    protected override Task<bool> VerifyMfaCode(Guid userId, string code, string? number) =>
        throw new NotSupportedException();

    protected override Task SetResetCodeAndEmail(string email, string resetCode) =>
        throw new NotSupportedException();

    protected override Task<Func<string, Task>?> PasswordResetForResetCode(string resetCode) =>
        throw new NotSupportedException();

    protected override Task<bool> EmailChangeForUserId(
        Guid userId,
        string hashedPassword,
        string newEmail
    ) => throw new NotSupportedException();

    protected override Task<(bool, Func<string, Task<string>>?)> PasswordChangeForUserId(
        Guid userId,
        string oldHashedPassword
    ) => throw new NotSupportedException();

    protected override Task<bool> ChangeMfaNumberForUserId(
        Guid userId,
        string hashedPassword,
        string newNumber
    ) => throw new NotSupportedException();
}
