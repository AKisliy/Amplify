namespace UserService.Infrastructure.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Models;
using UserService.Infrastructure.Options;

public class TokenService(UserManager<ApplicationUser> userManager, IJwtTokenGenerator tokenGenerator) : ITokenService
{

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

    public async Task<(Result Result, Guid UserId, string Email, IList<string> Roles)> ValidateRefreshTokenAsync(Guid userId, string refreshToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        if (user == null)
        {
            return (Result.Failure(["User not found"]), Guid.Empty, string.Empty, new List<string>());
        }

        var storedValue = await userManager.GetAuthenticationTokenAsync(user, "Default", "RefreshToken");

        if (string.IsNullOrEmpty(storedValue))
        {
            return (Result.Failure(["Invalid refresh token"]), Guid.Empty, string.Empty, new List<string>());
        }

        var parts = storedValue.Split(';');
        if (parts.Length != 2)
        {
            return (Result.Failure(["Corrupted token data"]), Guid.Empty, string.Empty, new List<string>());
        }

        var storedToken = parts[0];
        var expiryTicks = long.Parse(parts[1]);
        var expiryDate = new DateTime(expiryTicks, DateTimeKind.Utc);

        if (storedToken != refreshToken)
        {
            return (Result.Failure(["Invalid refresh token"]), Guid.Empty, string.Empty, new List<string>());
        }

        if (expiryDate < DateTime.UtcNow)
        {
            await userManager.RemoveAuthenticationTokenAsync(user, "Default", "RefreshToken");
            return (Result.Failure(["Refresh token expired"]), Guid.Empty, string.Empty, new List<string>());
        }

        var roles = await userManager.GetRolesAsync(user);
        return (Result.Success(), user.Id, user.Email!, roles);
    }

    public async Task<string> GenerateEmailConfirmationTokenAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString()) ?? throw new Exception("User not found");

        return await userManager.GenerateEmailConfirmationTokenAsync(user);
    }

    public async Task<string?> GeneratePasswordResetTokenAsync(string email)
    {
        var user = await userManager.FindByEmailAsync(email);

        if (user == null || !await userManager.IsEmailConfirmedAsync(user))
        {
            return null;
        }

        return await userManager.GeneratePasswordResetTokenAsync(user);
    }

    public Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token)
    {
        return Task.FromResult(tokenGenerator.GetPrincipalFromToken(token));
    }

    public JsonWebKeySet GetJwks() => tokenGenerator.GetJwks();
}
