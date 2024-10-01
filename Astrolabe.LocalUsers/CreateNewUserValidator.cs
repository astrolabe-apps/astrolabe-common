using FluentValidation;

namespace Astrolabe.LocalUsers;

public class CreateNewUserValidator<TNewUser> : AbstractValidator<TNewUser> where TNewUser : ICreateNewUser
{
    public CreateNewUserValidator(int sameEmail, LocalUserMessages messages)
    {
        this.RulesForEmail(x => x.Email, sameEmail, messages);
        RuleFor(x => x.Password).NotEmpty();
        RuleFor(x => x.Confirm).Must((nu, c) => nu.Password == c)
            .WithMessage(messages.PasswordMismatch);
    }
}

public class ChangeEmailValidator : AbstractValidator<ChangeEmail>
{
    public ChangeEmailValidator(int sameEmail, LocalUserMessages messages)
    {
        this.RulesForEmail(x => x.NewEmail, sameEmail, messages);
    }
}

public class ChangeMfaNumberValidator: AbstractValidator<ChangeMfaNumber>
{
    public ChangeMfaNumberValidator()
    {
        RuleFor(x => x.Password).NotEmpty();
        RuleFor(x => x.NewNumber).NotEmpty();
    }
}

public class VerifyAccountValidator: AbstractValidator<VerifyAccountRequest>
{
    public VerifyAccountValidator()
    {
        When(x => x.OtherNumber, () => {
            RuleFor(x => x.Number).NotEmpty();
        });
    }
}