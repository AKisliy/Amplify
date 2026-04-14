using System.Text;
using Flurl;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;
using UserService.Domain.Events.Auth;

namespace UserService.Application.Auth.EventHandlers;

public class UserRegisteredEventHandler(
    IEmailService emailService,
    IOptions<FrontendOptions> frontendOptions,
    ILogger<UserRegisteredEventHandler> logger)
    : INotificationHandler<UserRegisteredEvent>
{
    public async Task Handle(UserRegisteredEvent notification, CancellationToken cancellationToken)
    {
        var encodedToken = WebEncoders.Base64UrlEncode(
            Encoding.UTF8.GetBytes(notification.RawConfirmationToken));

        var options = frontendOptions.Value;
        var callbackUrl = Url
            .Combine(options.Url, options.EmailConfirmationPath)
            .SetQueryParams(new { userId = notification.UserId, code = encodedToken });

        try
        {
            await emailService.SendConfirmationLinkAsync(notification.Email, callbackUrl);
        }
        catch (Exception ex)
        {
            // Email delivery failures must not roll back the user record.
            // The user can request a new confirmation link via the resend flow.
            logger.LogError(
                ex,
                "Failed to send confirmation email to {Email} for user {UserId}",
                notification.Email,
                notification.UserId);
        }
    }
}
