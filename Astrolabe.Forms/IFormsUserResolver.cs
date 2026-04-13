using System.Security.Claims;

namespace Astrolabe.Forms;

public record FormsUser(Guid PersonId, IList<string> Roles);

public interface IFormsUserResolver
{
    Task<FormsUser> ResolveUser(ClaimsPrincipal principal);
}