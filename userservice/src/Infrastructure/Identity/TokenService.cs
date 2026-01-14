namespace UserService.Infrastructure.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using UserService.Application.Common.Interfaces;
using UserService.Infrastructure.Options;

public class TokenService : ITokenService, IDisposable
{
    private readonly RSA _rsaKey;
    private readonly JwtOptions _options;
    private readonly UserManager<ApplicationUser> _userManager;

    public TokenService(IOptions<JwtOptions> options, UserManager<ApplicationUser> userManager)
    {
        _options = options.Value;
        _userManager = userManager;
        _rsaKey = RSA.Create();

        try
        {
            _rsaKey.ImportFromPem(_options.PrivateKeyPem);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Could not load RSA Private Key from configuration. Check 'Jwt:PrivateKeyPem'.", ex);
        }
    }

    public Task<string> GenerateAccessTokenAsync(Guid userId, string email, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new RsaSecurityKey(_rsaKey);

        var creds = new SigningCredentials(key, SecurityAlgorithms.RsaSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }

    public async Task<string> GenerateRefreshTokenAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) throw new Exception("User not found");

        var randomNumber = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        var refreshToken = Convert.ToBase64String(randomNumber);

        // TODO: Change to use options
        var expiryTime = DateTime.UtcNow.AddDays(30);

        var tokenValueToStore = $"{refreshToken};{expiryTime.Ticks}";

        await _userManager.SetAuthenticationTokenAsync(user, "Default", "RefreshToken", tokenValueToStore);

        return refreshToken;
    }

    public Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateLifetime = false,
            IssuerSigningKey = new RsaSecurityKey(_rsaKey),
            ValidateIssuerSigningKey = true
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                return Task.FromResult<ClaimsPrincipal?>(null);
            }
            return Task.FromResult<ClaimsPrincipal?>(principal);
        }
        catch
        {
            return Task.FromResult<ClaimsPrincipal?>(null);
        }
    }

    public JsonWebKeySet GetJwks()
    {
        var parameters = _rsaKey.ExportParameters(includePrivateParameters: false);

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

    public void Dispose()
    {
        _rsaKey.Dispose();
    }
}
