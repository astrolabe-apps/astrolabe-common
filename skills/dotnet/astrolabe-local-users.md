# Astrolabe.LocalUsers - User Management Library

## Overview

Astrolabe.LocalUsers provides comprehensive abstractions and base classes for implementing robust local user management in .NET applications. It handles account creation, authentication, multi-factor authentication (MFA), password resets, and profile management.

**When to use**: Use this library when you need local user authentication (username/password) with email verification, MFA support, and password management features. Not needed if using external authentication providers (OAuth, Azure AD, etc.).

**Package**: `Astrolabe.LocalUsers`
**Dependencies**: FluentValidation, Astrolabe.Common
**TypeScript Client**: `@astroapps/client-localusers`
**Target Framework**: .NET 7-8

## Key Concepts

### 1. User Service Abstraction

`AbstractLocalUserService<TNewUser, TUserId>` provides the core logic for user management operations. You implement abstract methods to integrate with your database and email service.

### 2. Controller Abstraction

`AbstractLocalUserController<TNewUser, TUserId>` provides standard REST API endpoints for user operations. Extend it and implement `GetUserId()` to extract the current user from claims.

### 3. Password Security

Built-in `IPasswordHasher` interface with `SaltedSha256PasswordHasher` implementation. Can be replaced with bcrypt or other hashing algorithms.

### 4. Multi-Factor Authentication

Optional MFA support via SMS/phone verification codes, integrated into the authentication flow.

### 5. Email Verification

New accounts start unverified and require email confirmation before full access.

## Common Patterns

### Basic Setup - User Model

```csharp
using Astrolabe.LocalUsers;

// 1. Define your new user model
public class NewUser : ICreateNewUser
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Confirm { get; set; } = string.Empty;

    // Additional fields as needed
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
}

// 2. Define your user entity (database model)
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string HashedPassword { get; set; } = string.Empty;
    public string? VerificationCode { get; set; }
    public bool EmailVerified { get; set; }
    public string? MfaNumber { get; set; }
    public string? MfaCode { get; set; }
    public DateTime? MfaCodeExpiry { get; set; }
    public string? ResetCode { get; set; }
    public DateTime? ResetCodeExpiry { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
```

### Implementing the User Service

```csharp
using Astrolabe.LocalUsers;
using Astrolabe.Email;
using Microsoft.EntityFrameworkCore;

public class UserService : AbstractLocalUserService<NewUser, Guid>
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly TokenGenerator _tokenGenerator;

    public UserService(
        AppDbContext context,
        IEmailService emailService,
        TokenGenerator tokenGenerator,
        IPasswordHasher passwordHasher,
        LocalUserMessages? messages = null)
        : base(passwordHasher, messages)
    {
        _context = context;
        _emailService = emailService;
        _tokenGenerator = tokenGenerator;
    }

    // Send verification email with code
    protected override async Task SendVerificationEmail(NewUser newUser, string verificationCode)
    {
        await _emailService.SendEmail(new EmailMessage
        {
            To = newUser.Email,
            Subject = "Verify your email",
            Body = $"Your verification code is: {verificationCode}"
        });
    }

    // Create unverified account
    protected override async Task CreateUnverifiedAccount(
        NewUser newUser,
        string hashedPassword,
        string verificationCode)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = newUser.Email,
            FirstName = newUser.FirstName,
            LastName = newUser.LastName,
            HashedPassword = hashedPassword,
            VerificationCode = verificationCode,
            EmailVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    // Check if email already exists
    protected override async Task<int> CountExistingForEmail(string email)
    {
        return await _context.Users.CountAsync(u => u.Email == email);
    }

    // Verify email with code and return JWT token
    protected override async Task<string?> VerifyAccountCode(string code)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.VerificationCode == code);

        if (user == null) return null;

        user.EmailVerified = true;
        user.VerificationCode = null;
        await _context.SaveChangesAsync();

        return GenerateToken(user);
    }

    // Authenticate with username/password
    protected override async Task<string?> AuthenticatedHashed(
        AuthenticateRequest request,
        string hashedPassword)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Username && u.HashedPassword == hashedPassword);

        if (user == null || !user.EmailVerified) return null;

        return GenerateToken(user);
    }

    // Send MFA code via SMS
    protected override async Task<bool> SendCode(MfaCodeRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Username);

        if (user == null || string.IsNullOrEmpty(user.MfaNumber)) return false;

        var code = GenerateCode();
        user.MfaCode = code;
        user.MfaCodeExpiry = DateTime.UtcNow.AddMinutes(10);
        await _context.SaveChangesAsync();

        // Send SMS with code
        await _smsService.SendSms(user.MfaNumber, $"Your MFA code is: {code}");

        return true;
    }

    // Verify MFA code and authenticate
    protected override async Task<string?> MfaVerifyAccountForUserId(MfaAuthenticateRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Username);

        if (user == null) return null;

        if (user.MfaCode != request.Code || user.MfaCodeExpiry < DateTime.UtcNow)
            return null;

        user.MfaCode = null;
        user.MfaCodeExpiry = null;
        await _context.SaveChangesAsync();

        return GenerateToken(user);
    }

    // Set reset code for password reset
    protected override async Task SetResetCodeAndEmail(string email, string resetCode)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user != null)
        {
            user.ResetCode = resetCode;
            user.ResetCodeExpiry = DateTime.UtcNow.AddHours(24);
            await _context.SaveChangesAsync();

            await _emailService.SendEmail(new EmailMessage
            {
                To = email,
                Subject = "Password Reset",
                Body = $"Your password reset code is: {resetCode}"
            });
        }
    }

    // Change password (authenticated)
    protected override async Task<(bool, Func<string, Task<string>>?)> PasswordChangeForUserId(
        Guid userId,
        string hashedPassword)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null || user.HashedPassword != hashedPassword)
            return (false, null);

        return (true, async (newHashedPassword) =>
        {
            user.HashedPassword = newHashedPassword;
            await _context.SaveChangesAsync();
            return GenerateToken(user);
        });
    }

    // Change password with reset code
    protected override async Task<Func<string, Task<string>>?> PasswordChangeForResetCode(string resetCode)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ResetCode == resetCode && u.ResetCodeExpiry > DateTime.UtcNow);

        if (user == null) return null;

        return async (newHashedPassword) =>
        {
            user.HashedPassword = newHashedPassword;
            user.ResetCode = null;
            user.ResetCodeExpiry = null;
            await _context.SaveChangesAsync();
            return GenerateToken(user);
        };
    }

    // Helper methods
    private string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Email),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName)
        };

        return _tokenGenerator(claims, 3600); // 1 hour
    }

    private string GenerateCode() => Random.Shared.Next(100000, 999999).ToString();
}
```

### Implementing the Controller

```csharp
using Astrolabe.LocalUsers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/users")]
public class UserController : AbstractLocalUserController<NewUser, Guid>
{
    public UserController(ILocalUserService<NewUser, Guid> userService)
        : base(userService)
    {
    }

    protected override Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException());
    }

    // Optional: Add custom endpoints
    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        var userId = GetUserId();
        // Return user profile
        return Ok(new { UserId = userId });
    }
}
```

### Dependency Injection Setup

```csharp
using Astrolabe.LocalUsers;
using Astrolabe.Web.Common;

var builder = WebApplication.CreateBuilder(args);

// Password hasher
builder.Services.AddSingleton<IPasswordHasher, SaltedSha256PasswordHasher>();

// Or use a stronger hashing algorithm
// builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

// User service
builder.Services.AddScoped<ILocalUserService<NewUser, Guid>, UserService>();
builder.Services.AddScoped<UserService>();

// JWT token generator (from Astrolabe.Web.Common)
var jwtToken = new BasicJwtToken(/* ... */);
builder.Services.AddSingleton(jwtToken.MakeTokenSigner());

builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

### Custom Password Requirements

```csharp
public class UserService : AbstractLocalUserService<NewUser, Guid>
{
    protected override void ApplyPasswordRules<T>(AbstractValidator<T> validator)
    {
        // Minimum 10 characters
        validator.RuleFor(x => x.Password).MinimumLength(10);

        // Must contain uppercase
        validator.RuleFor(x => x.Password)
            .Must(HasUpperCase)
            .WithMessage("Password must contain an uppercase letter");

        // Must contain number
        validator.RuleFor(x => x.Password)
            .Must(HasNumber)
            .WithMessage("Password must contain a number");

        // Must contain special character
        validator.RuleFor(x => x.Password)
            .Must(HasSpecialChar)
            .WithMessage("Password must contain a special character");
    }

    private bool HasUpperCase(string password) => password.Any(char.IsUpper);
    private bool HasNumber(string password) => password.Any(char.IsDigit);
    private bool HasSpecialChar(string password) => password.Any(c => !char.IsLetterOrDigit(c));
}
```

### Custom Error Messages

```csharp
var messages = new LocalUserMessages
{
    AccountExists = "This email is already registered. Please login instead.",
    PasswordMismatch = "The passwords you entered do not match.",
    PasswordWrong = "The password you entered is incorrect.",
    EmailInvalid = "Please enter a valid email address.",
    PasswordTooShort = "Password must be at least 10 characters long."
};

builder.Services.AddScoped<ILocalUserService<NewUser, Guid>>(sp =>
    new UserService(
        sp.GetRequiredService<AppDbContext>(),
        sp.GetRequiredService<IEmailService>(),
        sp.GetRequiredService<TokenGenerator>(),
        sp.GetRequiredService<IPasswordHasher>(),
        messages
    ));
```

### Custom Email Validation Rules

```csharp
public class UserService : AbstractLocalUserService<NewUser, Guid>
{
    protected override Task ApplyCreationRules(NewUser user, AbstractValidator<NewUser> validator)
    {
        // Only allow company email addresses
        validator.RuleFor(x => x.Email)
            .Must(x => x.EndsWith("@mycompany.com"))
            .WithMessage("Only company email addresses are allowed");

        // Require first and last name
        validator.RuleFor(x => x.FirstName).NotEmpty();
        validator.RuleFor(x => x.LastName).NotEmpty();

        return Task.CompletedTask;
    }
}
```

## API Endpoints

The controller provides these standard endpoints:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/create` | POST | Create new account | No |
| `/verify` | POST | Verify email with code | No |
| `/mfaVerify` | POST | Verify account with MFA | No |
| `/authenticate` | POST | Login with username/password | No |
| `/mfaCode/authenticate` | POST | Send MFA code | No |
| `/mfaAuthenticate` | POST | Authenticate with MFA code | No |
| `/forgotPassword` | POST | Initiate password reset | No |
| `/changeEmail` | POST | Change email address | Yes |
| `/changeMfaNumber` | POST | Change MFA phone number | Yes |
| `/mfaChangeMfaNumber` | POST | Change MFA number with verification | Yes |
| `/changePassword` | POST | Change password (authenticated) | Yes |
| `/resetPassword` | POST | Reset password with code | No |
| `/mfaCode/number` | POST | Send MFA code to specific number | Yes |

## Best Practices

### 1. Use Strong Password Hashing

```csharp
// ✅ DO - Use bcrypt or similar
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

// ⚠️ CAUTION - SaltedSha256 is provided but bcrypt is stronger
builder.Services.AddSingleton<IPasswordHasher, SaltedSha256PasswordHasher>();

// ❌ DON'T - Never store plain text passwords
```

### 2. Set Reasonable Code Expiration Times

```csharp
// ✅ DO - Short expiration for codes
user.MfaCodeExpiry = DateTime.UtcNow.AddMinutes(10); // 10 minutes
user.ResetCodeExpiry = DateTime.UtcNow.AddHours(24); // 24 hours

// ❌ DON'T - Codes that never expire or last too long
user.MfaCodeExpiry = DateTime.UtcNow.AddDays(365); // Way too long!
```

### 3. Validate Email Sending

```csharp
// ✅ DO - Handle email sending failures gracefully
protected override async Task SendVerificationEmail(NewUser newUser, string code)
{
    try
    {
        await _emailService.SendEmail(/* ... */);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to send verification email to {Email}", newUser.Email);
        throw new InvalidOperationException("Failed to send verification email. Please try again later.");
    }
}

// ❌ DON'T - Silently fail email sending
```

### 4. Rate Limit Authentication Attempts

```csharp
// ✅ DO - Implement rate limiting
[RateLimit(MaxRequests = 5, WindowMinutes = 15)]
[HttpPost("authenticate")]
public override Task<IActionResult> Authenticate([FromBody] AuthenticateRequest request)
{
    return base.Authenticate(request);
}
```

## Troubleshooting

### Common Issues

**Issue: Users can't verify their email**
- **Cause**: Verification code not being saved or email not sent
- **Solution**: Check `CreateUnverifiedAccount` saves the code and `SendVerificationEmail` is working. Check email service logs.

**Issue: Password validation failing unexpectedly**
- **Cause**: Custom validation rules too strict or conflicting
- **Solution**: Review `ApplyPasswordRules` and `ApplyCreationRules`. Test with simple passwords first.

**Issue: JWT token null after authentication**
- **Cause**: Token generator not configured or claims incorrect
- **Solution**: Verify `TokenGenerator` is registered in DI and check claim generation in authentication methods

**Issue: MFA codes always invalid**
- **Cause**: Code expiry too short or time zone issues
- **Solution**: Use `DateTime.UtcNow` consistently, increase expiry window for testing

**Issue: Password reset not working**
- **Cause**: Reset code not saved or expired
- **Solution**: Check `SetResetCodeAndEmail` saves code with appropriate expiry. Verify email contains correct reset link/code.

**Issue: FluentValidation errors not showing**
- **Cause**: ValidationException not being caught by exception handler
- **Solution**: Ensure you have exception handling middleware that catches `ValidationException` and returns 400 responses with error details

**Issue: Users can create accounts with duplicate emails**
- **Cause**: `CountExistingForEmail` not checking correctly
- **Solution**: Verify the query checks email case-insensitively:
  ```csharp
  return await _context.Users.CountAsync(u => u.Email.ToLower() == email.ToLower());
  ```

## Project Structure Location

- **Path**: `Astrolabe.LocalUsers/`
- **Project File**: `Astrolabe.LocalUsers.csproj`
- **Namespace**: `Astrolabe.LocalUsers`
- **NuGet**: https://www.nuget.org/packages/Astrolabe.LocalUsers/

## Related Documentation

- [Astrolabe.Web.Common](./astrolabe-web-common.md) - JWT token generation
- [Astrolabe.Email](./astrolabe-email.md) - Email sending
- [client-localusers](../typescript/client-localusers.md) - TypeScript client
- [FluentValidation](https://docs.fluentvalidation.net/) - Validation framework
