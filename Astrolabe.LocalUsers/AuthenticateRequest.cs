namespace Astrolabe.LocalUsers;

public record AuthenticateRequest(string Username, string Password, bool RememberMe);