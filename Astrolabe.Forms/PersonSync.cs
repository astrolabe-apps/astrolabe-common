namespace Astrolabe.Forms;

public record PersonDetails(string FirstName, string LastName);

public interface PersonSync
{
    public PersonDetails? GetPersonSync();
    public PersonSync SyncPerson(PersonDetails details);
}
