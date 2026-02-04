using Flurl;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using System.Text;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;

namespace UserService.Application.Auth.Register;

public record RegisterUserCommand(string Email, string Password) : IRequest<Guid>;

public class RegisterUserCommandHandler(
    ITokenService tokenService,
    IIdentityService identityService,
    IOptions<FrontendOptions> frontendOptions,
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

        var baseFrontendUrl = frontendOptions.Value.Url;
        var emailConfirmationPath = frontendOptions.Value.EmailConfirmationPath;

        var callbackUrl = Url.Combine(baseFrontendUrl, emailConfirmationPath).SetQueryParams(new { userId, code = encodedToken });

        await emailService.SendConfirmationLinkAsync(request.Email, callbackUrl);
        return userId;
    }
}

