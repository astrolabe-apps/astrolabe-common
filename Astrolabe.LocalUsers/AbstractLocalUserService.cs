using Astrolabe.Common.Exceptions;
using FluentValidation;

namespace Astrolabe.LocalUsers;

public abstract class AbstractLocalUserService<TNewUser, TUserId>
    : ILocalUserService<TNewUser, TUserId>
    where TNewUser : ICreateNewUser
{
    private readonly IPasswordHasher _passwordHasher;
    private readonly LocalUserMessages _localUserMessages;

    protected AbstractLocalUserService(
        IPasswordHasher passwordHasher,
        LocalUserMessages? localUserMessages
    )
    {
        _passwordHasher = passwordHasher;
        _localUserMessages = localUserMessages ?? new LocalUserMessages();
    }

    public async Task CreateAccount(TNewUser newUser)
    {
        var existingAccounts = await CountExisting(newUser);
        var validator = new CreateNewUserValidator<TNewUser>(existingAccounts, _localUserMessages);
        await ApplyCreationRules(newUser, validator);
        ApplyPasswordRules(validator);
        await validator.ValidateAndThrowAsync(newUser);
        var emailCode = CreateEmailCode();
        await CreateUnverifiedAccount(newUser, _passwordHasher.Hash(newUser.Password), emailCode);
        await SendVerificationEmail(newUser, emailCode);
    }

    protected abstract Task SendVerificationEmail(TNewUser newUser, string verificationCode);

    protected abstract Task CreateUnverifiedAccount(
        TNewUser newUser,
        string hashedPassword,
        string verificationCode
    );

    protected virtual string CreateEmailCode()
    {
        return Guid.NewGuid().ToString();
    }

    protected virtual Task ApplyCreationRules(TNewUser user, AbstractValidator<TNewUser> validator)
    {
        return Task.CompletedTask;
    }

    protected virtual Task ApplyChangeEmailRules(
        ChangeEmail user,
        AbstractValidator<ChangeEmail> validator
    )
    {
        return Task.CompletedTask;
    }

    protected virtual void ApplyPasswordRules<T>(AbstractValidator<T> validator)
        where T : IPasswordHolder
    {
        validator.RuleFor(x => x.Password).MinimumLength(8);
    }

    protected virtual Task ApplyChangeNumberRules(
        ChangeMfaNumber change,
        AbstractValidator<ChangeMfaNumber> validator
    )
    {
        return Task.CompletedTask;
    }

    protected virtual Task ApplyMfaCodeRules(
        MfaCodeRequest request,
        AbstractValidator<MfaCodeRequest> validator
    )
    {
        return Task.CompletedTask;
    }

    protected virtual Task<int> CountExisting(TNewUser newUser)
    {
        return CountExistingForEmail(newUser.Email);
    }

    protected abstract Task<int> CountExistingForEmail(string email);

    public async Task<string> VerifyAccount(string code)
    {
        var token = await VerifyAccountCode(code);
        if (token == null)
            throw new UnauthorizedException();
        return token;
    }

    protected abstract Task<string?> VerifyAccountCode(string code);

    public async Task<string> Authenticate(AuthenticateRequest authenticateRequest)
    {
        var hashed = _passwordHasher.Hash(authenticateRequest.Password);
        var token = await AuthenticatedHashed(authenticateRequest, hashed);
        if (token == null)
            throw new UnauthorizedException();
        return token;
    }

    public async Task<string> VerifyAccountWithMfa(MfaAuthenticateRequest mfaAuthenticateRequest)
    {
        var token = await VerifyAccountWithMfaForUserId(mfaAuthenticateRequest);
        if (token == null)
            throw new UnauthorizedException();
        return token;
    }

    protected abstract Task<string?> VerifyAccountWithMfaForUserId(
        MfaAuthenticateRequest mfaAuthenticateRequest
    );

    protected abstract Task<string?> AuthenticatedHashed(
        AuthenticateRequest authenticateRequest,
        string hashedPassword
    );

    public async Task ForgotPassword(string email)
    {
        var resetCode = CreateEmailCode();
        await SetResetCodeAndEmail(email, resetCode);
    }

    public async Task SendAuthenticationMfaCode(MfaCodeRequest mfaCodeRequest)
    {
        var validator = new MfaCodeValidator();
        await ApplyMfaCodeRules(mfaCodeRequest, validator);
        await validator.ValidateAndThrowAsync(mfaCodeRequest);

        if (!await SendCode(mfaCodeRequest))
            throw new UnauthorizedException();
    }

    protected abstract Task<bool> SendCode(MfaCodeRequest mfaCodeRequest);

    protected abstract Task<bool> SendCode(TUserId userId, string? number = null);

    public async Task<string> CompleteAuthentication(MfaAuthenticateRequest mfaAuthenticateRequest)
    {
        var token = await VerifyMfaCode(
            mfaAuthenticateRequest.Token,
            mfaAuthenticateRequest.Code,
            mfaAuthenticateRequest.Number
        );
        if (token == null)
            throw new UnauthorizedException();
        return token;
    }

    protected abstract Task<string?> VerifyMfaCode(string token, string code, string? number);

    protected abstract Task<bool> VerifyMfaCode(TUserId userId, string code, string? number);
    protected abstract Task SetResetCodeAndEmail(string email, string resetCode);

    public async Task ChangeEmail(ChangeEmail change, Func<TUserId> userId)
    {
        var sameEmail = await CountExistingForEmail(change.NewEmail);
        var validator = new ChangeEmailValidator(sameEmail, _localUserMessages);
        await ApplyChangeEmailRules(change, validator);
        await validator.ValidateAndThrowAsync(change);
        var hashedPassword = _passwordHasher.Hash(change.Password);
        if (!await EmailChangeForUserId(userId(), hashedPassword, change.NewEmail))
            throw new UnauthorizedException();
    }

    protected abstract Task<bool> EmailChangeForUserId(
        TUserId userId,
        string hashedPassword,
        string newEmail
    );

    public async Task<string> ChangePassword(ChangePassword change, Func<TUserId> userId)
    {
        var (passwordOk, applyChange) = await PasswordChangeForUserId(
            userId(),
            _passwordHasher.Hash(change.OldPassword)
        );
        if (applyChange == null)
            throw new NotFoundException();

        var validator = new ChangePasswordValidator(passwordOk, _localUserMessages);
        ApplyPasswordRules(validator);
        await validator.ValidateAndThrowAsync(change);
        return await applyChange(_passwordHasher.Hash(change.Password));
    }

    protected abstract Task<(bool, Func<string, Task<string>>?)> PasswordChangeForUserId(
        TUserId userId,
        string oldHashedPassword
    );

    public async Task InitiateMfaNumberChange(ChangeMfaNumber change, Func<TUserId> userId)
    {
        var hashedPassword = _passwordHasher.Hash(change.Password);
        var validator = new ChangeMfaNumberValidator();
        await ApplyChangeNumberRules(change, validator);
        await validator.ValidateAndThrowAsync(change);
        if (!await ChangeMfaNumberForUserId(userId(), hashedPassword, change.NewNumber))
            throw new UnauthorizedException();
    }

    protected abstract Task<bool> ChangeMfaNumberForUserId(
        TUserId userId,
        string hashedPassword,
        string newNumber
    );

    public async Task CompleteMfaNumberChange(MfaChangeNumber change, Func<TUserId> userId)
    {
        if (!await VerifyMfaCode(userId(), change.Code, change.Number))
            throw new UnauthorizedException();
    }

    public async Task SendMfaCodeToNumber(string number, Func<TUserId> userId)
    {
        await SendCode(userId(), number);
    }

    protected abstract Task<Func<string, Task>?> PasswordResetForResetCode(string resetCode);

    public async Task ResetPassword(ResetPassword reset, string resetCode)
    {
        var applyChange = await PasswordResetForResetCode(resetCode);
        if (applyChange == null)
            throw new NotFoundException();

        var validator = new ResetPasswordValidator(_localUserMessages);
        ApplyPasswordRules(validator);
        await validator.ValidateAndThrowAsync(reset);
        await applyChange(_passwordHasher.Hash(reset.Password));
    }
}