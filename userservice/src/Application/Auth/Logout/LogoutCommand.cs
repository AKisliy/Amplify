using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Logout;

public record LogoutCommand : IRequest;

public class LogoutCommandHandler(IUser user, ITokenService tokenService)
    : IRequestHandler<LogoutCommand>
{
    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var userId = Guard.Against.Null(user.Id, nameof(user.Id));

        await tokenService.RevokeRefreshTokenAsync(userId);
        return;
    }
}
