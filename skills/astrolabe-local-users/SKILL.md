---
name: astrolabe-local-users
description: .NET library for local user authentication with email verification, MFA, password resets, and account management. Use when implementing username/password authentication instead of external OAuth providers.
---

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

    // Helper method
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
        return Ok(new { UserId = userId });
    }
}
```

## API Endpoints

The controller provides these standard endpoints:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/create` | POST | Create new account | No |
| `/verify` | POST | Verify email with code | No |
| `/authenticate` | POST | Login with username/password | No |
| `/forgotPassword` | POST | Initiate password reset | No |
| `/changePassword` | POST | Change password (authenticated) | Yes |
| `/resetPassword` | POST | Reset password with code | No |

## Best Practices

### 1. Use Strong Password Hashing

```csharp
// ✅ DO - Use bcrypt or similar
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

// ⚠️ CAUTION - SaltedSha256 is provided but bcrypt is stronger
builder.Services.AddSingleton<IPasswordHasher, SaltedSha256PasswordHasher>();
```

### 2. Set Reasonable Code Expiration Times

```csharp
// ✅ DO - Short expiration for codes
user.MfaCodeExpiry = DateTime.UtcNow.AddMinutes(10); // 10 minutes
user.ResetCodeExpiry = DateTime.UtcNow.AddHours(24); // 24 hours

// ❌ DON'T - Codes that never expire or last too long
user.MfaCodeExpiry = DateTime.UtcNow.AddDays(365); // Way too long!
```

## Troubleshooting

### Common Issues

**Issue: Users can't verify their email**
- **Cause**: Verification code not being saved or email not sent
- **Solution**: Check `CreateUnverifiedAccount` saves the code and `SendVerificationEmail` is working

**Issue: JWT token null after authentication**
- **Cause**: Token generator not configured or claims incorrect
- **Solution**: Verify `TokenGenerator` is registered in DI and check claim generation

**Issue: Password reset not working**
- **Cause**: Reset code not saved or expired
- **Solution**: Check `SetResetCodeAndEmail` saves code with appropriate expiry

## Project Structure Location

- **Path**: `Astrolabe.LocalUsers/`
- **Project File**: `Astrolabe.LocalUsers.csproj`
- **Namespace**: `Astrolabe.LocalUsers`
