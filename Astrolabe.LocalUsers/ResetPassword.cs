namespace Astrolabe.LocalUsers;

public record ResetPassword(string Password, string Confirm) : IPasswordHolder;
