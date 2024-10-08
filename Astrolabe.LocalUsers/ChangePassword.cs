namespace Astrolabe.LocalUsers;

public record ChangePassword(string OldPassword, string Password, string Confirm) : IPasswordHolder;

public record AuthenticateRequest(string Username, string Password, bool RememberMe);

public record MfaCodeRequest(string Token, bool UpdateNumber, string? Number);

public record MfaAuthenticateRequest(string Token, string Code, string? Number);
