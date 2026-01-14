using UserService.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Resend;
using UserService.Application.Common.Interfaces;

namespace UserService.Infrastructure;

public class ResendEmailSender(
    IOptions<MailOptions> options,
    ILogger<ResendEmailSender> logger) : IEmailService
{
    private const string BrandColor = "#323232";
    private const string AppName = "Amplify";

    public async Task SendConfirmationLinkAsync(string email, string confirmationLink)
    {
        logger.LogInformation("Sending confirmation link");
        var content = $@"
            <h1 style=""font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 20px;"">Подтвердите ваш Email</h1>
            <p style=""font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 20px;"">
                Спасибо за регистрацию в {AppName}! Пожалуйста, подтвердите свой адрес электронной почты, нажав на кнопку ниже.
            </p>
            <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""width: 100%; margin-bottom: 20px;"">
                <tr>
                    <td align=""center"">
                        <a href=""{confirmationLink}"" style=""background-color: {BrandColor}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"">
                            Подтвердить Email
                        </a>
                    </td>
                </tr>
            </table>
            <p style=""font-size: 14px; color: #6b7280; margin-top: 20px;"">
                Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                <a href=""{confirmationLink}"" style=""color: {BrandColor}; word-break: break-all;"">{confirmationLink}</a>
            </p>";

        await SendEmail(email, "Подтверждение регистрации", GenerateHtmlTemplate(content));
    }

    public async Task SendPasswordResetLinkAsync(string email, string resetLink)
    {
        var content = $@"
            <h1 style=""font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 20px;"">Сброс пароля</h1>
            <p style=""font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 20px;"">
                Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы задать новый пароль.
            </p>
            <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""width: 100%; margin-bottom: 20px;"">
                <tr>
                    <td align=""center"">
                        <a href=""{resetLink}"" style=""background-color: {BrandColor}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"">
                            Сбросить пароль
                        </a>
                    </td>
                </tr>
            </table>
            <p style=""font-size: 14px; color: #6b7280; margin-top: 20px;"">
                Или перейдите по ссылке:<br>
                <a href=""{resetLink}"" style=""color: {BrandColor}; word-break: break-all;"">{resetLink}</a>
            </p>";

        await SendEmail(email, "Восстановление доступа", GenerateHtmlTemplate(content));
    }

    private string GenerateHtmlTemplate(string bodyContent)
    {
        return $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=""UTF-8"">
            <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
                .card {{ background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af; }}
            </style>
        </head>
        <body>
            <div class=""container"">
                <div style=""text-align: center; margin-bottom: 24px;"">
                    <h2 style=""color: #374151; margin: 0;"">{AppName}</h2>
                </div>

                <div class=""card"">
                    {bodyContent}
                </div>

                <div class=""footer"">
                    <p>&copy; {DateTime.Now.Year} {AppName}. Все права защищены.</p>
                    <p>Это автоматическое письмо, не отвечайте на него.</p>
                </div>
            </div>
        </body>
        </html>";
    }

    private async Task SendEmail(string toEmail, string subject, string htmlBody)
    {
        IResend resend = ResendClient.Create(options.Value.ApiKey);

        var resp = await resend.EmailSendAsync(new EmailMessage()
        {
            From = "onboarding@resend.dev",
            To = toEmail,
            Subject = subject,
            HtmlBody = htmlBody,
        });

        if (!resp.Success)
        {
            throw new Exception($"Failed to send email: {resp?.Exception?.Message ?? "no message"}");
        }
    }
}