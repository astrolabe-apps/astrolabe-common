namespace Astrolabe.LocalUsers;

public record ChangePassword(string OldPassword, string Password, string Confirm) : IPasswordHolder;
