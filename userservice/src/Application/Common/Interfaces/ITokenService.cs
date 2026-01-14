using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using UserService.Application.Common.Models;

namespace UserService.Application.Common.Interfaces;

public interface ITokenService
{
    Task<string> GenerateAccessTokenAsync(Guid userId, string email, IList<string> roles);

    Task<string> GenerateRefreshTokenAsync(Guid userId);

    Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token);

    JsonWebKeySet GetJwks();

    Task<string> GenerateEmailConfirmationTokenAsync(Guid userId);

    Task<(Result Result, Guid UserId, string Email, IList<string> Roles)> ValidateRefreshTokenAsync(Guid userId, string refreshToken);

    Task<string?> GeneratePasswordResetTokenAsync(string email);
}
