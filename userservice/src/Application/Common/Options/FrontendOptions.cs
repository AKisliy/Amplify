namespace UserService.Application.Common.Options;

public class FrontendOptions
{
    public const string SectionName = "Frontend";

    public required string Url { get; set; }

    public required string EmailConfirmedPath { get; set; }

    public required string PasswordResetPath { get; set; }

    public required string EmailConfirmationPath { get; set; }
}
