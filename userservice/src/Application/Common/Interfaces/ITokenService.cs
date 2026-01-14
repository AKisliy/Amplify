using System.Security.Claims;

namespace UserService.Application.Common.Interfaces;

public interface ITokenService
{
    Task<string> GenerateAccessTokenAsync(Guid userId, string email, IList<string> roles);

    Task<string> GenerateRefreshTokenAsync(Guid userId);

    Task<ClaimsPrincipal?> GetPrincipalFromExpiredToken(string token);
}
