using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.Password;

public record ResetPasswordCommand(string Email, string ResetCode, string NewPassword) : IRequest;

public class ResetPasswordCommandHandler(IIdentityService identityService) : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.ResetCode));
        await identityService.ResetPasswordAsync(request.Email, code, request.NewPassword);
    }
}
