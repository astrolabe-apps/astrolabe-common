namespace Astrolabe.LocalUsers;

public interface ILocalUserService<TNewUser, TUserId> where TNewUser : ICreateNewUser
{
    Task CreateAccount(TNewUser newUser);
    Task<string> VerifyAccount(string code);
    Task<string> MfaVerifyAccount(MfaAuthenticateRequest mfaAuthenticateRequest);
    Task<string> Authenticate(AuthenticateRequest authenticateRequest);
    Task SendMfaCode(MfaCodeRequest mfaCodeRequest);
    Task SendMfaCode(string number, Func<TUserId> userId);
    Task<string> MfaAuthenticate(MfaAuthenticateRequest mfaAuthenticateRequest);
    Task ForgotPassword(string email);
    Task<string> ChangePassword(ChangePassword change, string? resetCode, Func<TUserId> userId);
    Task ChangeEmail(ChangeEmail change, Func<TUserId> userId);
    Task ChangeMfaNumber(ChangeMfaNumber change, Func<TUserId> userId);
    Task MfaChangeMfaNumber(MfaChangeNumber change, Func<TUserId> userId);
}