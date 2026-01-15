namespace UserService.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendConfirmationLinkAsync(string email, string confirmationLink);

    Task SendPasswordResetLinkAsync(string email, string resetLink);
}