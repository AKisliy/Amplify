using FluentValidation;

namespace UserService.Infrastructure.Options;

public class MailOptions
{
    public const string SectionName = "MailOptions";

    public string ApiKey { get; set; } = null!;

    public string FromEmail { get; set; } = null!;
}

public class MailOptionsValidator : AbstractValidator<MailOptions>
{
    public MailOptionsValidator()
    {
        RuleFor(x => x.ApiKey)
            .NotEmpty()
            .WithMessage("ApiKey is required.");

        RuleFor(x => x.FromEmail)
            .NotEmpty()
            .EmailAddress()
            .WithMessage("A valid FromEmail is required.");
    }
}
