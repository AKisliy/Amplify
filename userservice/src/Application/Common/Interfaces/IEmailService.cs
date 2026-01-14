namespace UserService.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendConfirmationLinkAsync(string email, string confirmationLink);
}