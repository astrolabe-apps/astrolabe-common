using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfPersonService
{
    private readonly DbContext _dbContext;

    public EfPersonService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private DbSet<Person> Persons => _dbContext.Set<Person>();

    public async Task<Person> GetOrCreatePerson(
        Guid externalId,
        string firstName,
        string lastName,
        string? email
    )
    {
        var person = await Persons.Where(x => x.ExternalId == externalId).SingleOrDefaultAsync();

        if (person == null)
        {
            person = new Person
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

    public IEnumerable<string> RolesFromPerson(Person person)
    {
        return person.Roles.Split(",").Where(x => !string.IsNullOrWhiteSpace(x));
    }
}
