using Microsoft.AspNetCore.WebUtilities;
using System.Text;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Register;

public record RegisterUserCommand(string Email, string Password) : IRequest<Guid>;

public class RegisterUserCommandHandler(
    ITokenService tokenService,
    IIdentityService identityService,
    IEmailService emailService) : IRequestHandler<RegisterUserCommand, Guid>
{
    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var (result, userId) = await identityService.CreateUserAsync(request.Email, request.Password);

        // TODO: change to have validator
        if (!result.Succeeded)
        {
            throw new Exception();
        }

        var rawToken = await tokenService.GenerateEmailConfirmationTokenAsync(userId);

        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));

        // TODO: remove hardcode, discover how to enable case-insensitive paramaters (like UserId vs userid)
        var callbackUrl = $"https://localhost:5000/api/Auth/confirmEmail?UserId={userId}&Code={encodedToken}";

        await emailService.SendConfirmationLinkAsync(request.Email, callbackUrl);
        return userId;
    }
}

