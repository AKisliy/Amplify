namespace UserService.Application.Common.Options;

public class FrontendOptions
{
    public const string SectionName = "Frontend";

    public required string Url { get; set; }

    public required string EmailConfirmedPath { get; set; }

    public required string PasswordResetPath { get; set; }

    public required string EmailConfirmationPath { get; set; }
}

internal sealed class FrontendOptionsValidator : AbstractValidator<FrontendOptions>
{
    public FrontendOptionsValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("Url is required.");

        RuleFor(x => x.EmailConfirmedPath)
            .NotEmpty()
            .WithMessage("EmailConfirmedPath is required.");

        RuleFor(x => x.PasswordResetPath)
            .NotEmpty()
            .WithMessage("PasswordResetPath is required.");

        RuleFor(x => x.EmailConfirmationPath)
            .NotEmpty()
            .WithMessage("EmailConfirmationPath is required.");
    }
}
