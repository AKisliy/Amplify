using Microsoft.Extensions.Logging;
using UserService.Application.Common.Interfaces;

namespace UserService.Infrastructure.Mail;

public class DummyEmailSender(ILogger<DummyEmailSender> logger) : IEmailService
{
    public Task SendConfirmationLinkAsync(string email, string confirmationLink)
    {
        logger.LogInformation("DummyEmailSender: Simulating sending confirmation link to {Email}: {Link}", email, confirmationLink);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetLinkAsync(string email, string resetLink)
    {
        logger.LogInformation("DummyEmailSender: Simulating sending password reset link to {Email}: {Link}", email, resetLink);
        return Task.CompletedTask;
    }
}
