namespace Astrolabe.LocalUsers;

public interface IPasswordHasher
{
    string Hash(string password);
}