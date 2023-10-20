using System.Security.Cryptography;
using System.Text;

namespace Astrolabe.LocalUsers;

public class SaltedSha256PasswordHasher : IPasswordHasher
{
    private readonly string _salt;

    public SaltedSha256PasswordHasher(string salt)
    {
        _salt = salt;
    }

    public string Hash(string password)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(_salt + password)));
    }
}