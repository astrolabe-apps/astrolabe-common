using FluentValidation;

namespace Astrolabe.LocalUsers;

public class ResetPasswordValidator : AbstractValidator<ResetPassword>
{
    public ResetPasswordValidator(LocalUserMessages messages)
    {
        RuleFor(x => x.Password).NotEmpty();
        RuleFor(x => x.Confirm)
            .Must((nu, c) => nu.Password == c)
            .WithMessage(messages.PasswordMismatch);
    }
}
