using UserService.Application.Common.Interfaces;
using UserService.Domain.Events.Auth;

namespace UserService.Application.Auth.Register;

public record RegisterUserCommand(string Email, string Password) : IRequest<Guid>;

public class RegisterUserCommandHandler(
    ITokenService tokenService,
    IIdentityService identityService,
    IMediator mediator) : IRequestHandler<RegisterUserCommand, Guid>
{
    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var (result, userId) = await identityService.CreateUserAsync(request.Email, request.Password);

        // TODO: change to have validator
        if (!result.Succeeded)
        {
            throw new Exception(result.Errors.FirstOrDefault() ?? "Failed to create user");
        }

        var rawToken = await tokenService.GenerateEmailConfirmationTokenAsync(userId);

        await mediator.Publish(
            new UserRegisteredEvent(userId, request.Email, rawToken),
            cancellationToken);

        return userId;
    }
}
