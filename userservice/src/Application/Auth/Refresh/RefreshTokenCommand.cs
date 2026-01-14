using System.Security.Claims;
using UserService.Application.Auth.Login;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Refresh;

public record RefreshTokenCommand(string AccessToken, string RefreshToken) : IRequest<LoginResponse>;

public class RefreshTokenCommandHandler(ITokenService tokenService) : IRequestHandler<RefreshTokenCommand, LoginResponse>
{
    public async Task<LoginResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var principal = await tokenService.GetPrincipalFromExpiredToken(request.AccessToken);

        var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier);
        var userIdString = userIdClaim?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid access token claims");
        }

        var (result, _, email, roles) = await tokenService.ValidateRefreshTokenAsync(userId, request.RefreshToken);

        if (!result.Succeeded)
        {
            throw new UnauthorizedAccessException("Invalid refresh token");
        }

        var newAccessToken = await tokenService.GenerateAccessTokenAsync(userId, email, roles);
        var newRefreshToken = await tokenService.GenerateRefreshTokenAsync(userId);

        return new LoginResponse(newAccessToken, newRefreshToken);
    }
}
