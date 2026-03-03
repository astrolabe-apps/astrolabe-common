using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Astrolabe.LocalUsers.Oidc;
using Astrolabe.Web.Common;
using Microsoft.IdentityModel.Tokens;

namespace Astrolabe.TestTemplate.Service;

public class TestOidcUserClaimsProvider(BasicJwtToken jwtToken) : IOidcUserClaimsProvider
{
    public Task<IEnumerable<Claim>?> GetClaimsFromUserToken(string userJwt)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                IssuerSigningKey = new SymmetricSecurityKey(jwtToken.SecretKey),
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtToken.Issuer,
                ValidateIssuer = true,
                ValidAudience = jwtToken.Audience,
                ValidateAudience = true,
            };

            var principal = tokenHandler.ValidateToken(
                userJwt,
                validationParameters,
                out _
            );

            var claims = new List<Claim>();

            var sub = principal.FindFirst(ClaimTypes.NameIdentifier);
            if (sub != null)
                claims.Add(new Claim("sub", sub.Value));

            var name = principal.FindFirst(ClaimTypes.Name);
            if (name != null)
                claims.Add(new Claim("name", name.Value));

            var email = principal.FindFirst(ClaimTypes.Email);
            if (email != null)
                claims.Add(new Claim("email", email.Value));

            return Task.FromResult<IEnumerable<Claim>?>(claims);
        }
        catch
        {
            return Task.FromResult<IEnumerable<Claim>?>(null);
        }
    }
}
