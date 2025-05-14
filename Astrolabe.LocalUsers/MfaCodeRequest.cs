namespace Astrolabe.LocalUsers;

public record MfaCodeRequest(string Token, bool UpdateNumber, string? Number);