using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace UserService.Application.Common.Interfaces;

public interface ITokenService
{
    Task<string> GenerateAccessTokenAsync(Guid userId, string email, IList<string> roles);

    Task<string> GenerateRefreshTokenAsync(Guid userId);

    Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token);

    JsonWebKeySet GetJwks();
}
