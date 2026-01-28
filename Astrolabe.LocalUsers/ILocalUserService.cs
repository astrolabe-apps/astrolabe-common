namespace Astrolabe.LocalUsers;

/// <summary>
/// Service interface for local user authentication and account management.
/// Handles user registration, authentication, MFA, and password/email changes.
/// </summary>
/// <typeparam name="TNewUser">The type used for creating new user accounts, must implement <see cref="ICreateNewUser"/>.</typeparam>
/// <typeparam name="TUserId">The type used for user identifiers (e.g., Guid, int).</typeparam>
public interface ILocalUserService<TNewUser, TUserId>
    where TNewUser : ICreateNewUser
{
    /// <summary>
    /// Creates a new unverified user account and sends a verification email.
    /// The account cannot be used until verified via <see cref="VerifyAccount"/> or <see cref="VerifyAccountWithMfa"/>.
    /// </summary>
    /// <param name="newUser">The new user details including email, password, and any additional required fields.</param>
    /// <exception cref="FluentValidation.ValidationException">Thrown when validation fails (e.g., email already exists, password too weak).</exception>
    Task CreateAccount(TNewUser newUser);

    /// <summary>
    /// Verifies a user account using the code from the verification email.
    /// Returns an MFA token that must be used with <see cref="VerifyAccountWithMfa"/> to complete verification
    /// when MFA is enabled, or returns a full authentication JWT if MFA is not required.
    /// </summary>
    /// <param name="code">The verification code from the email link.</param>
    /// <returns>An MFA token for further verification, or a full JWT if MFA is not required.</returns>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when the verification code is invalid or expired.</exception>
    Task<string> VerifyAccount(string code);

    /// <summary>
    /// Completes account verification using MFA code after initial email verification.
    /// This is the final step in the account creation flow when MFA is enabled.
    /// Marks the account as verified and enabled, then returns a full authentication JWT.
    /// </summary>
    /// <param name="mfaAuthenticateRequest">Contains the MFA token (from <see cref="VerifyAccount"/>) and the SMS code.</param>
    /// <returns>A full authentication JWT for the verified user.</returns>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when the MFA token or code is invalid.</exception>
    Task<string> VerifyAccountWithMfa(MfaAuthenticateRequest mfaAuthenticateRequest);

    /// <summary>
    /// Authenticates a user with username (email) and password.
    /// Returns either a full JWT (if MFA was recently verified) or an MFA token
    /// requiring further verification via <see cref="CompleteAuthentication"/>.
    /// </summary>
    /// <param name="authenticateRequest">Contains username, password, and rememberMe flag.</param>
    /// <returns>A full JWT if MFA not required, or an MFA token requiring <see cref="SendAuthenticationMfaCode"/> and <see cref="CompleteAuthentication"/>.</returns>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when credentials are invalid or account is not verified.</exception>
    Task<string> Authenticate(AuthenticateRequest authenticateRequest);

    /// <summary>
    /// Sends an MFA code via SMS during authentication or account verification.
    /// The code is typically valid for a limited time (e.g., 24 minutes).
    /// </summary>
    /// <param name="mfaCodeRequest">Contains the MFA token and optionally a new phone number to send the code to.</param>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when the MFA token is invalid.</exception>
    /// <exception cref="FluentValidation.ValidationException">Thrown when the phone number format is invalid.</exception>
    Task SendAuthenticationMfaCode(MfaCodeRequest mfaCodeRequest);

    /// <summary>
    /// Sends an MFA code to a specific phone number for the authenticated user.
    /// Used when changing MFA number - sends code to verify ownership of the new number.
    /// </summary>
    /// <param name="number">The phone number to send the MFA code to.</param>
    /// <param name="userId">Function to retrieve the current authenticated user's ID.</param>
    Task SendMfaCodeToNumber(string number, Func<TUserId> userId);

    /// <summary>
    /// Completes MFA verification during authentication.
    /// Validates the SMS code and returns a full authentication JWT.
    /// Updates the last MFA verification time to potentially skip MFA on future logins.
    /// </summary>
    /// <param name="mfaAuthenticateRequest">Contains the MFA token, SMS code, and optionally a new MFA number to set.</param>
    /// <returns>A full authentication JWT for the authenticated user.</returns>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when the MFA token or code is invalid/expired.</exception>
    Task<string> CompleteAuthentication(MfaAuthenticateRequest mfaAuthenticateRequest);

    /// <summary>
    /// Initiates the password reset flow by sending a reset email.
    /// The email contains a link with a reset code/token for use with <see cref="ResetPassword"/>.
    /// Silently succeeds even if the email doesn't exist (to prevent email enumeration).
    /// </summary>
    /// <param name="email">The email address of the account to reset.</param>
    Task ForgotPassword(string email);

    /// <summary>
    /// Resets the user's password using a reset code from the forgot password email.
    /// Validates the new password against password rules and updates the account.
    /// </summary>
    /// <param name="reset">Contains the new password.</param>
    /// <param name="resetCode">The reset code/token from the password reset email.</param>
    /// <exception cref="Astrolabe.Common.Exceptions.NotFoundException">Thrown when the reset code is invalid or expired.</exception>
    /// <exception cref="FluentValidation.ValidationException">Thrown when the new password doesn't meet requirements.</exception>
    Task ResetPassword(ResetPassword reset, string resetCode);

    /// <summary>
    /// Changes the password for an authenticated user.
    /// Requires the current password for verification before setting the new password.
    /// </summary>
    /// <param name="change">Contains the old password and new password.</param>
    /// <param name="userId">Function to retrieve the current authenticated user's ID.</param>
    /// <returns>A new authentication JWT after successful password change.</returns>
    /// <exception cref="Astrolabe.Common.Exceptions.NotFoundException">Thrown when the user is not found.</exception>
    /// <exception cref="FluentValidation.ValidationException">Thrown when old password is incorrect or new password doesn't meet requirements.</exception>
    Task<string> ChangePassword(ChangePassword change, Func<TUserId> userId);

    /// <summary>
    /// Changes the email address for an authenticated user.
    /// Requires password verification. Sends a verification email to the new address.
    /// The new email is not active until verified.
    /// </summary>
    /// <param name="change">Contains the current password and new email address.</param>
    /// <param name="userId">Function to retrieve the current authenticated user's ID.</param>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when password verification fails.</exception>
    /// <exception cref="FluentValidation.ValidationException">Thrown when the new email is invalid or already in use.</exception>
    Task ChangeEmail(ChangeEmail change, Func<TUserId> userId);

    /// <summary>
    /// Initiates MFA number change by sending a verification code to the new number.
    /// Requires password verification. The number is not changed until verified via <see cref="CompleteMfaNumberChange"/>.
    /// </summary>
    /// <param name="change">Contains the current password and new MFA phone number.</param>
    /// <param name="userId">Function to retrieve the current authenticated user's ID.</param>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when password verification fails.</exception>
    /// <exception cref="FluentValidation.ValidationException">Thrown when the phone number format is invalid.</exception>
    Task InitiateMfaNumberChange(ChangeMfaNumber change, Func<TUserId> userId);

    /// <summary>
    /// Completes MFA number change by verifying the code sent to the new number.
    /// Updates the user's MFA number after successful verification.
    /// </summary>
    /// <param name="change">Contains the new MFA number and the verification code.</param>
    /// <param name="userId">Function to retrieve the current authenticated user's ID.</param>
    /// <exception cref="Astrolabe.Common.Exceptions.UnauthorizedException">Thrown when the verification code is invalid.</exception>
    Task CompleteMfaNumberChange(MfaChangeNumber change, Func<TUserId> userId);
}