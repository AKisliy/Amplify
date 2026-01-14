namespace UserService.Infrastructure.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using UserService.Application.Common.Interfaces;
using UserService.Infrastructure.Options;

public class TokenService(
    IOptions<JwtOptions> options,
    UserManager<ApplicationUser> userManager,
    IJwtTokenGenerator tokenGenerator) : ITokenService
{
    private readonly JwtOptions _options = options.Value;

    public Task<string> GenerateAccessTokenAsync(Guid userId, string email, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = tokenGenerator.SignToken(claims, DateTime.UtcNow.AddMinutes(15));

        return Task.FromResult(token);
    }

    public async Task<string> GenerateRefreshTokenAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString()) ?? throw new Exception("User not found");
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        var refreshToken = Convert.ToBase64String(randomNumber);

        var expiryTime = DateTime.UtcNow.AddDays(30);
        await userManager.SetAuthenticationTokenAsync(user, "Default", "RefreshToken", $"{refreshToken};{expiryTime.Ticks}");

        return refreshToken;
    }

    public Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token)
    {
        return Task.FromResult(tokenGenerator.GetPrincipalFromToken(token));
    }

    public JsonWebKeySet GetJwks() => tokenGenerator.GetJwks();
}
