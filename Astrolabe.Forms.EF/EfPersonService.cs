using Astrolabe.Forms;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfPersonService<TPerson>
    where TPerson : class, IPerson, new()
{
    private readonly DbContext _dbContext;

    public EfPersonService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private DbSet<TPerson> Persons => _dbContext.Set<TPerson>();

    public async Task<TPerson> GetOrCreatePerson(
        Guid externalId,
        string firstName,
        string lastName,
        string? email
    )
    {
        var person = await Persons.Where(x => x.ExternalId == externalId).SingleOrDefaultAsync();

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
        await _dbContext.SaveChangesAsync();
        return person;
    }

    public IEnumerable<string> RolesFromPerson(TPerson person)
    {
        return person.Roles.Split(",").Where(x => !string.IsNullOrWhiteSpace(x));
    }
}
