
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Password;

public record ForgotPasswordCommand(string Email) : IRequest;

public class ForgotPasswordCommandHandler(
    IIdentityService identityService,
    IEmailService emailService) : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var code = await identityService.GeneratePasswordResetTokenAsync(request.Email);

        if (string.IsNullOrEmpty(code))
        {
            return;
        }

        code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));

        // TODO: get base url from options
        var callbackUrl = $"https://localhost:5001/reset-password?email={request.Email}&code={code}";

        await emailService.SendPasswordResetLinkAsync(request.Email, callbackUrl);
    }
}
