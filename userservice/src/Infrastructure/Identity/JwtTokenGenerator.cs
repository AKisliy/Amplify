using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using UserService.Infrastructure.Options;

namespace UserService.Infrastructure.Identity;

public interface IJwtTokenGenerator
{
    string SignToken(IEnumerable<Claim> claims, DateTime expires);
    JsonWebKeySet GetJwks();
    ClaimsPrincipal? GetPrincipalFromToken(string token);
}

public class JwtTokenGenerator : IJwtTokenGenerator, IDisposable
{
    private readonly RSA _rsa;
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;
    private readonly RsaSecurityKey _key;

    public JwtTokenGenerator(IOptions<JwtOptions> options)
    {
        _options = options.Value;

        _rsa = RSA.Create();
        try
        {
            _rsa.ImportFromPem(_options.PrivateKeyPem);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Invalid RSA Key", ex);
        }

        _key = new RsaSecurityKey(_rsa) { KeyId = "auth-key-1" };
        _credentials = new SigningCredentials(_key, SecurityAlgorithms.RsaSha256);
    }

    public string SignToken(IEnumerable<Claim> claims, DateTime expires)
    {
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: _credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public JsonWebKeySet GetJwks()
    {
        var parameters = _rsa.ExportParameters(false);
        var jwk = new JsonWebKey
        {
            Kty = JsonWebAlgorithmsKeyTypes.RSA,
            Use = "sig",
            Kid = "auth-key-1",
            N = Base64UrlEncoder.Encode(parameters.Modulus),
            E = Base64UrlEncoder.Encode(parameters.Exponent),
            Alg = SecurityAlgorithms.RsaSha256
        };

        return new JsonWebKeySet { Keys = { jwk } };
    }

    public ClaimsPrincipal? GetPrincipalFromToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _key,
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false
        };

        try
        {
            var principal = tokenHandler.ValidateToken(token, validationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.RsaSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }
            return principal;
        }
        catch
        {
            return null;
        }
    }

    public void Dispose()
    {
        _rsa?.Dispose();
    }
}