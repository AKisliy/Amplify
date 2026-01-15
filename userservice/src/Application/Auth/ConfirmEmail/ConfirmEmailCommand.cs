using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Auth.ConfirmEmail;

public record ConfirmEmailCommand(Guid UserId, string Code) : IRequest;

public class ConfirmEmailCommandHandler(IIdentityService identityService) : IRequestHandler<ConfirmEmailCommand>
{
    public async Task Handle(ConfirmEmailCommand request, CancellationToken cancellationToken)
    {
        var code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Code));
        await identityService.ConfirmUserEmail(request.UserId, code);
    }
}

