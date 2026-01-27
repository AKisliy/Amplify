using Flurl;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using System.Text;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;
using Microsoft.Extensions.Logging;
using UserService.Application.Common.Exceptions;

namespace UserService.Application.Auth.Register;

public record RegisterUserCommand(string Email, string Password) : IRequest<Guid>;

public class RegisterUserCommandHandler(
    ITokenService tokenService,
    IIdentityService identityService,
    IOptions<FrontendOptions> frontendOptions,
    IEmailService emailService,
    ILogger<RegisterUserCommandHandler> logger) : IRequestHandler<RegisterUserCommand, Guid>
{
    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var (result, userId) = await identityService.CreateUserAsync(request.Email, request.Password);

        // TODO: change to have validator
        if (!result.Succeeded)
        {
            var failures = result.Errors.Select(e => new FluentValidation.Results.ValidationFailure(string.Empty, e));
            throw new UserService.Application.Common.Exceptions.ValidationException(failures);
        }

        var rawToken = await tokenService.GenerateEmailConfirmationTokenAsync(userId);

        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));

        var baseFrontendUrl = frontendOptions.Value.Url;
        var emailConfirmationPath = frontendOptions.Value.EmailConfirmationPath;

        var callbackUrl = Url.Combine(baseFrontendUrl, emailConfirmationPath).SetQueryParams(new { userId, code = encodedToken });

        logger.LogWarning("Confirmation link for {Email}: {Url}", request.Email, callbackUrl);

        try
        {
            await emailService.SendConfirmationLinkAsync(request.Email, callbackUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send confirmation email to {Email}. User was created successfully.", request.Email);
            // Continue - user is created, they just won't get the email
        }

        return userId;
    }
}

