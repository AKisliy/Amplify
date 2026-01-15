
using System.ComponentModel.DataAnnotations;
using System.Text;
using Flurl;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;

namespace UserService.Application.Auth.Password;

public record ForgotPasswordCommand(string Email) : IRequest;

public class ForgotPasswordCommandHandler(
    ITokenService tokenService,
    IEmailService emailService,
    IOptions<FrontendOptions> frontendOptions) : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var code = await tokenService.GeneratePasswordResetTokenAsync(request.Email);

        if (string.IsNullOrEmpty(code))
        {
            return;
        }

        code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));

        var baseFrontendUrl = frontendOptions.Value.Url;
        var passwordResetPage = frontendOptions.Value.PasswordResetPath;

        var callbackUrl = Url.Combine(baseFrontendUrl, passwordResetPage).SetQueryParams(new { email = request.Email, code });

        await emailService.SendPasswordResetLinkAsync(request.Email, callbackUrl);
    }
}
