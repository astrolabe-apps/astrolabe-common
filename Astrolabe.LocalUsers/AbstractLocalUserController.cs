using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.LocalUsers;

public abstract class AbstractLocalUserController<TNewUser, TUserId> : ControllerBase
    where TNewUser : ICreateNewUser
{
    private readonly ILocalUserService<TNewUser, TUserId> _localUserService;

    protected AbstractLocalUserController(ILocalUserService<TNewUser, TUserId> localUserService)
    {
        _localUserService = localUserService;
    }

    [HttpPost("create")]
    public Task CreateAccount([FromBody] TNewUser newUser)
    {
        return _localUserService.CreateAccount(newUser);
    }

    [HttpPost("verify")]
    public Task<string> VerifyAccount([FromForm] string code)
    {
        return _localUserService.VerifyAccount(code);
    }

    [HttpPost("mfaVerify")]
    public Task<string> MfaVerifyAccount([FromBody] MfaAuthenticateRequest mfaVerifyAccountRequest)
    {
        return _localUserService.MfaVerifyAccount(mfaVerifyAccountRequest);
    }

    [HttpPost("authenticate")]
    public Task<string> Authenticate([FromBody] AuthenticateRequest authenticateRequest)
    {
        return _localUserService.Authenticate(authenticateRequest);
    }

    [HttpPost("mfaCode/authenticate")]
    public async Task SendMfaCode([FromBody] MfaCodeRequest mfaCodeRequest)
    {
        await _localUserService.SendMfaCode(mfaCodeRequest);
    }

    [HttpPost("mfaAuthenticate")]
    public async Task<string> MfaAuthenticate(
        [FromBody] MfaAuthenticateRequest mfaAuthenticateRequest
    )
    {
        return await _localUserService.MfaAuthenticate(mfaAuthenticateRequest);
    }

    [HttpPost("forgotPassword")]
    public Task ForgotPassword(string email)
    {
        return _localUserService.ForgotPassword(email);
    }

    [HttpPost("changeEmail")]
    public Task ChangeEmail(ChangeEmail email)
    {
        return _localUserService.ChangeEmail(email, GetUserId);
    }

    [HttpPost("changeMfaNumber")]
    public Task ChangeMfaNumber(ChangeMfaNumber number)
    {
        return _localUserService.ChangeMfaNumber(number, GetUserId);
    }

    [HttpPost("mfaChangeMfaNumber")]
    public Task MfaChangeMfaNumber(MfaChangeNumber change)
    {
        return _localUserService.MfaChangeMfaNumber(change, GetUserId);
    }

    [Authorize]
    [HttpPost("changePassword")]
    public Task<string> ChangePassword([FromBody] ChangePassword change)
    {
        return _localUserService.ChangePassword(change, GetUserId);
    }

    [HttpPost("resetPassword")]
    public Task ResetPassword([FromBody] ResetPassword reset, [FromQuery] string resetCode)
    {
        return _localUserService.ResetPassword(reset, resetCode);
    }

    [HttpPost("mfaCode/number")]
    public async Task SendMfaCode(string number)
    {
        await _localUserService.SendMfaCode(number, GetUserId);
    }

    protected abstract TUserId GetUserId();
}
