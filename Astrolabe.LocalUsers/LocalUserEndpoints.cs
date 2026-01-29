using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.LocalUsers;

/// <summary>
/// Provides user ID extraction from HttpContext for authenticated endpoints.
/// </summary>
public interface ILocalUserIdProvider<TUserId>
{
    TUserId GetUserId(HttpContext context);
}

/// <summary>
/// Configuration options to enable/disable specific local user endpoints.
/// </summary>
public class LocalUserEndpointOptions
{
    public bool EnableCreateAccount { get; set; } = true;
    public bool EnableVerifyAccount { get; set; } = true;
    public bool EnableVerifyAccountWithMfa { get; set; } = true;
    public bool EnableAuthenticate { get; set; } = true;
    public bool EnableSendAuthenticationMfaCode { get; set; } = true;
    public bool EnableCompleteAuthentication { get; set; } = true;
    public bool EnableForgotPassword { get; set; } = true;
    public bool EnableChangeEmail { get; set; } = true;
    public bool EnableInitiateMfaNumberChange { get; set; } = true;
    public bool EnableCompleteMfaNumberChange { get; set; } = true;
    public bool EnableChangePassword { get; set; } = true;
    public bool EnableResetPassword { get; set; } = true;
    public bool EnableSendMfaCodeToNumber { get; set; } = true;
}

/// <summary>
/// Abstract base class for local user endpoints using Minimal APIs.
/// Override handler methods to customize business logic.
/// Override mapping methods to customize routes, authorization, or metadata.
/// </summary>
public abstract class LocalUserEndpoints<TNewUser, TUserId>
    where TNewUser : ICreateNewUser
{
    protected ILocalUserIdProvider<TUserId> UserIdProvider { get; }
    protected LocalUserEndpointOptions Options { get; }

    protected LocalUserEndpoints(
        ILocalUserIdProvider<TUserId> userIdProvider,
        LocalUserEndpointOptions? options = null
    )
    {
        UserIdProvider = userIdProvider;
        Options = options ?? new LocalUserEndpointOptions();
    }

    /// <summary>
    /// Gets the ILocalUserService from the request's service scope.
    /// </summary>
    protected ILocalUserService<TNewUser, TUserId> GetUserService(HttpContext context) =>
        context.RequestServices.GetRequiredService<ILocalUserService<TNewUser, TUserId>>();

    /// <summary>
    /// Maps all enabled endpoints to the route group.
    /// Override to completely customize which endpoints are registered.
    /// </summary>
    public virtual void MapEndpoints(RouteGroupBuilder group)
    {
        if (Options.EnableCreateAccount)
            MapCreateAccount(group);
        if (Options.EnableVerifyAccount)
            MapVerifyAccount(group);
        if (Options.EnableVerifyAccountWithMfa)
            MapVerifyAccountWithMfa(group);
        if (Options.EnableAuthenticate)
            MapAuthenticate(group);
        if (Options.EnableSendAuthenticationMfaCode)
            MapSendAuthenticationMfaCode(group);
        if (Options.EnableCompleteAuthentication)
            MapCompleteAuthentication(group);
        if (Options.EnableForgotPassword)
            MapForgotPassword(group);
        if (Options.EnableChangeEmail)
            MapChangeEmail(group);
        if (Options.EnableInitiateMfaNumberChange)
            MapInitiateMfaNumberChange(group);
        if (Options.EnableCompleteMfaNumberChange)
            MapCompleteMfaNumberChange(group);
        if (Options.EnableChangePassword)
            MapChangePassword(group);
        if (Options.EnableResetPassword)
            MapResetPassword(group);
        if (Options.EnableSendMfaCodeToNumber)
            MapSendMfaCodeToNumber(group);
    }

    #region Handler Methods

    protected virtual Task HandleCreateAccount(TNewUser newUser, HttpContext context) =>
        GetUserService(context).CreateAccount(newUser);

    protected virtual Task<string> HandleVerifyAccount(string code, HttpContext context) =>
        GetUserService(context).VerifyAccount(code);

    protected virtual Task<string> HandleVerifyAccountWithMfa(MfaAuthenticateRequest request, HttpContext context) =>
        GetUserService(context).VerifyAccountWithMfa(request);

    protected virtual Task<string> HandleAuthenticate(AuthenticateRequest request, HttpContext context) =>
        GetUserService(context).Authenticate(request);

    protected virtual Task HandleSendAuthenticationMfaCode(MfaCodeRequest request, HttpContext context) =>
        GetUserService(context).SendAuthenticationMfaCode(request);

    protected virtual Task<string> HandleCompleteAuthentication(MfaAuthenticateRequest request, HttpContext context) =>
        GetUserService(context).CompleteAuthentication(request);

    protected virtual Task HandleForgotPassword(string email, HttpContext context) =>
        GetUserService(context).ForgotPassword(email);

    protected virtual Task HandleChangeEmail(ChangeEmail change, HttpContext context) =>
        GetUserService(context).ChangeEmail(change, () => UserIdProvider.GetUserId(context));

    protected virtual Task HandleInitiateMfaNumberChange(
        ChangeMfaNumber change,
        HttpContext context
    ) => GetUserService(context).InitiateMfaNumberChange(change, () => UserIdProvider.GetUserId(context));

    protected virtual Task HandleCompleteMfaNumberChange(MfaChangeNumber change, HttpContext context) =>
        GetUserService(context).CompleteMfaNumberChange(change, () => UserIdProvider.GetUserId(context));

    protected virtual Task<string> HandleChangePassword(ChangePassword change, HttpContext context) =>
        GetUserService(context).ChangePassword(change, () => UserIdProvider.GetUserId(context));

    protected virtual Task HandleResetPassword(ResetPassword reset, string resetCode, HttpContext context) =>
        GetUserService(context).ResetPassword(reset, resetCode);

    protected virtual Task HandleSendMfaCodeToNumber(string number, HttpContext context) =>
        GetUserService(context).SendMfaCodeToNumber(number, () => UserIdProvider.GetUserId(context));

    #endregion

    #region Mapping Methods

    protected virtual RouteHandlerBuilder MapCreateAccount(RouteGroupBuilder group) =>
        group
            .MapPost("account", (TNewUser newUser, HttpContext context) => HandleCreateAccount(newUser, context))
            .WithName("CreateAccount");

    protected virtual RouteHandlerBuilder MapVerifyAccount(RouteGroupBuilder group) =>
        group
            .MapPost("account/verify", (string code, HttpContext context) => HandleVerifyAccount(code, context))
            .WithName("VerifyAccount");

    protected virtual RouteHandlerBuilder MapVerifyAccountWithMfa(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/verify/mfa",
                (MfaAuthenticateRequest request, HttpContext context) => HandleVerifyAccountWithMfa(request, context)
            )
            .WithName("VerifyAccountWithMfa");

    protected virtual RouteHandlerBuilder MapAuthenticate(RouteGroupBuilder group) =>
        group
            .MapPost("auth", (AuthenticateRequest request, HttpContext context) => HandleAuthenticate(request, context))
            .WithName("Authenticate");

    protected virtual RouteHandlerBuilder MapSendAuthenticationMfaCode(RouteGroupBuilder group) =>
        group
            .MapPost(
                "auth/mfa/send",
                (MfaCodeRequest request, HttpContext context) => HandleSendAuthenticationMfaCode(request, context)
            )
            .WithName("SendAuthenticationMfaCode");

    protected virtual RouteHandlerBuilder MapCompleteAuthentication(RouteGroupBuilder group) =>
        group
            .MapPost(
                "auth/mfa/complete",
                (MfaAuthenticateRequest request, HttpContext context) => HandleCompleteAuthentication(request, context)
            )
            .WithName("CompleteAuthentication");

    protected virtual RouteHandlerBuilder MapForgotPassword(RouteGroupBuilder group) =>
        group
            .MapPost("password/forgot", (string email, HttpContext context) => HandleForgotPassword(email, context))
            .WithName("ForgotPassword");

    protected virtual RouteHandlerBuilder MapChangeEmail(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/email",
                (ChangeEmail change, HttpContext context) => HandleChangeEmail(change, context)
            )
            .RequireAuthorization()
            .WithName("ChangeEmail");

    protected virtual RouteHandlerBuilder MapInitiateMfaNumberChange(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/mfa-number",
                (ChangeMfaNumber change, HttpContext context) =>
                    HandleInitiateMfaNumberChange(change, context)
            )
            .WithName("InitiateMfaNumberChange");

    protected virtual RouteHandlerBuilder MapCompleteMfaNumberChange(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/mfa-number/complete",
                (MfaChangeNumber change, HttpContext context) =>
                    HandleCompleteMfaNumberChange(change, context)
            )
            .RequireAuthorization()
            .WithName("CompleteMfaNumberChange");

    protected virtual RouteHandlerBuilder MapChangePassword(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/password",
                (ChangePassword change, HttpContext context) =>
                    HandleChangePassword(change, context)
            )
            .RequireAuthorization()
            .WithName("ChangePassword");

    protected virtual RouteHandlerBuilder MapResetPassword(RouteGroupBuilder group) =>
        group
            .MapPost(
                "password/reset",
                (ResetPassword reset, string resetCode, HttpContext context) => HandleResetPassword(reset, resetCode, context)
            )
            .WithName("ResetPassword");

    protected virtual RouteHandlerBuilder MapSendMfaCodeToNumber(RouteGroupBuilder group) =>
        group
            .MapPost(
                "account/mfa-number/send-code",
                (string number, HttpContext context) => HandleSendMfaCodeToNumber(number, context)
            )
            .WithName("SendMfaCodeToNumber");

    #endregion
}