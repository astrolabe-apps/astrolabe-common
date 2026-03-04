using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<TPerson> GetOrCreatePerson(Guid externalId, string firstName,
        string lastName, string? email)
    {
        var person = await Persons
            .Where(x => x.ExternalId == externalId)
            .SingleOrDefaultAsync();

        if (person == null)
        {
            person = new TPerson
            {
                ExternalId = externalId,
                EmailAddress = email,
                Roles = "",
            };
            Persons.Add(person);
        }

        person.FirstName = firstName;
        person.LastName = lastName;
        await SaveChanges();
        return person;
    }

    public IEnumerable<string> RolesFromPerson(TPerson person)
    {
        return person.Roles.Split(",").Where(x => !string.IsNullOrWhiteSpace(x));
    }
}
