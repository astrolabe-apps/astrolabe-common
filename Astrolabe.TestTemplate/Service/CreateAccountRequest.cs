using Astrolabe.LocalUsers;

namespace Astrolabe.TestTemplate.Service;

public record CreateAccountRequest(
    string Email,
    string Password,
    string Confirm,
    string FirstName,
    string LastName
) : ICreateNewUser;
