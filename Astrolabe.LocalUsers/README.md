# Astrolabe.LocalUsers

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.LocalUsers.svg)](https://www.nuget.org/packages/Astrolabe.LocalUsers/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive library for implementing local user management in .NET applications. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.LocalUsers provides abstractions and base classes for implementing robust user management, including:

- Account creation with email verification
- Secure password authentication
- Multi-factor authentication (MFA) via SMS/phone
- Password reset functionality
- User profile management (email and MFA number changes)

## Installation

```bash
dotnet add package Astrolabe.LocalUsers
```

## Features

### User Management

- **Account Creation**: Create new user accounts with email verification
- **Authentication**: Authenticate users with username/password
- **Multi-Factor Authentication**: MFA support using verification codes
- **Password Management**: Change and reset password flows
- **Profile Management**: Update email and MFA phone number

### Security Features

- **Password Hashing**: Secure password storage with salted SHA-256 hashing (customizable)
- **Validation**: Comprehensive validation for user inputs
- **MFA Support**: Two-factor authentication with verification codes

## Getting Started

### Step 1: Define Your User Model

Create a class that implements `ICreateNewUser`:

```csharp
public class NewUser : ICreateNewUser
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string Confirm { get; set; }
    
    // Additional properties as needed
}
```

### Step 2: Create a User ID Type

Define your user ID type (typically `int`, `Guid`, or `string`).

### Step 3: Implement a User Service

Extend the `AbstractLocalUserService<TNewUser, TUserId>` class:

```csharp
public class MyUserService : AbstractLocalUserService<NewUser, int>
{
    public MyUserService(IPasswordHasher passwordHasher, LocalUserMessages? messages = null) 
        : base(passwordHasher, messages)
    {
    }

    // Implement abstract methods (see implementation section below)
}
```

### Step 4: Set Up a Controller

Extend the `AbstractLocalUserController<TNewUser, TUserId>` class:

```csharp
[ApiController]
[Route("api/users")]
public class UserController : AbstractLocalUserController<NewUser, int>
{
    public UserController(ILocalUserService<NewUser, int> userService) 
        : base(userService)
    {
    }

    protected override int GetUserId()
    {
        // Extract user ID from the current authenticated user's claims
        return int.Parse(User.FindFirst("userId")?.Value ?? "0");
    }
}
```

## Implementation Guide

### Implementing AbstractLocalUserService

You must implement these abstract methods:

```csharp
// Send verification email with code
protected abstract Task SendVerificationEmail(TNewUser newUser, string verificationCode);

// Create unverified account in your database
protected abstract Task CreateUnverifiedAccount(TNewUser newUser, string hashedPassword, string verificationCode);

// Count existing users with the same email
protected abstract Task<int> CountExistingForEmail(string email);

// Verify email with code and return JWT token
protected abstract Task<string?> VerifyAccountCode(string code);

// MFA verification for account
protected abstract Task<string?> MfaVerifyAccountForUserId(MfaAuthenticateRequest mfaAuthenticateRequest);

// Authenticate with username/password and return JWT token
protected abstract Task<string?> AuthenticatedHashed(AuthenticateRequest authenticateRequest, string hashedPassword);

// Send an MFA code via SMS/phone
protected abstract Task<bool> SendCode(MfaCodeRequest mfaCodeRequest);
protected abstract Task<bool> SendCode(TUserId userId, string? number=null);

// Verify MFA code and return JWT token
protected abstract Task<string?> VerifyMfaCode(string token, string code, string? number);
protected abstract Task<bool> VerifyMfaCode(TUserId userId, string code, string? number);

// Set reset code for password reset
protected abstract Task SetResetCodeAndEmail(string email, string resetCode);

// Change email for a user
protected abstract Task<bool> EmailChangeForUserId(TUserId userId, string hashedPassword, string newEmail);

// Change password with appropriate methods
protected abstract Task<(bool, Func<string, Task<string>>?)> PasswordChangeForUserId(TUserId userId, string hashedPassword);
protected abstract Task<Func<string, Task<string>>?> PasswordChangeForResetCode(string resetCode);

// Change MFA phone number
protected abstract Task<bool> ChangeMfaNumberForUserId(TUserId userId, string hashedPassword, string newNumber);
```

## Customization

### Custom Password Requirements

Override the `ApplyPasswordRules` method in your service implementation:

```csharp
protected override void ApplyPasswordRules<T>(AbstractValidator<T> validator)
{
    // Default is 8 character minimum
    validator.RuleFor(x => x.Password).MinimumLength(10);
    validator.RuleFor(x => x.Password).Must(HasUpperCase).WithMessage("Password must contain an uppercase letter");
    validator.RuleFor(x => x.Password).Must(HasNumber).WithMessage("Password must contain a number");
}

private bool HasUpperCase(string password) => password.Any(char.IsUpper);
private bool HasNumber(string password) => password.Any(char.IsDigit);
```

### Custom Error Messages

Provide a custom `LocalUserMessages` instance:

```csharp
var messages = new LocalUserMessages
{
    AccountExists = "This email is already registered",
    PasswordMismatch = "Passwords do not match",
    PasswordWrong = "The password you entered is incorrect",
    EmailInvalid = "Please enter a valid email address"
};

var userService = new MyUserService(passwordHasher, messages);
```

### Custom Email Validation Rules

Override the `ApplyCreationRules` method:

```csharp
protected override Task ApplyCreationRules(NewUser user, AbstractValidator<NewUser> validator)
{
    // Add domain-specific validation
    validator.RuleFor(x => x.Email).Must(x => x.EndsWith("@mycompany.com"))
        .WithMessage("Only company email addresses are allowed");
    
    return Task.CompletedTask;
}
```

## Secure Password Storage

The library includes a `SaltedSha256PasswordHasher` implementation, but you can create your own by implementing the `IPasswordHasher` interface:

```csharp
public class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}
```

## API Endpoints

The controller provides these standard endpoints:

- `POST /create` - Create a new account
- `POST /verify` - Verify account with email code
- `POST /mfaVerify` - Verify account with MFA
- `POST /authenticate` - Authenticate with username/password
- `POST /mfaCode/authenticate` - Send MFA code
- `POST /mfaAuthenticate` - Authenticate with MFA code
- `POST /forgotPassword` - Initiate password reset
- `POST /changeEmail` - Change email address
- `POST /changeMfaNumber` - Change MFA phone number
- `POST /mfaChangeMfaNumber` - Change MFA number with verification
- `POST /changePassword` - Change password (authenticated)
- `POST /resetPassword` - Reset password (with reset code)
- `POST /mfaCode/number` - Send MFA code to a specific number

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.LocalUsers)
- [Documentation](https://github.com/astrolabe-apps/astrolabe-common/tree/main/Astrolabe.LocalUsers)