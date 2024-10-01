namespace Astrolabe.LocalUsers;

public record VerifyAccountRequest(string Token, bool OtherNumber, string? Number);

public record MfaVerifyAccountRequest(string Token, string Code, string? Number);