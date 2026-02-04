using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Login;

public record LoginUserCommand(string Email, string Password) : IRequest<LoginResponse>;

public class LoginUserCommandHandler(
    IIdentityService identityService,
    ITokenService tokenService)
    : IRequestHandler<LoginUserCommand, LoginResponse>
{
    public async Task<LoginResponse> Handle(LoginUserCommand request, CancellationToken cancellationToken)
    {
        var (userId, email, roles) = await identityService.AuthenticateAsync(request.Email, request.Password);

        var accessToken = await tokenService.GenerateAccessTokenAsync(userId, email, roles);
        var refreshToken = await tokenService.GenerateRefreshTokenAsync(userId);

        return new LoginResponse(accessToken, refreshToken);
    }
}

