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

    [HttpPost("authenticate")]
    public Task<string> Authenticate([FromBody] AuthenticateRequest authenticateRequest)
    {
        return _localUserService.Authenticate(authenticateRequest);
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

    [Authorize]
    [AllowAnonymous]
    [HttpPost("changePassword")]
    public Task<string> ChangePassword([FromBody] ChangePassword change, [FromQuery] string? resetCode)
    {
        return _localUserService.ChangePassword(change, resetCode, GetUserId);
    }

    protected abstract TUserId GetUserId();
}