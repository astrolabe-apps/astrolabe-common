namespace Astrolabe.LocalUsers;

public record ChangeMfaNumber(string Password, string NewNumber) : IPasswordHolder;
public record MfaChangeNumber(string Number, string Code);