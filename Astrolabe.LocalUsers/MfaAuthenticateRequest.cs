namespace Astrolabe.LocalUsers;

public record MfaAuthenticateRequest(string Token, string Code, string? Number);