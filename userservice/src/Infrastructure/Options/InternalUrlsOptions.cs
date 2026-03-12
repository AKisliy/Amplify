using FluentValidation;

namespace UserService.Infrastructure.Options;

public class InternalUrlsOptions
{
    public const string SectionName = "InternalUrls";

    public required string MediaServiceInternalBaseUrl { get; set; }
}

internal sealed class InternalUrlsOptionsValidator : AbstractValidator<InternalUrlsOptions>
{
    public InternalUrlsOptionsValidator()
    {
        RuleFor(x => x.MediaServiceInternalBaseUrl)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("MediaServiceInternalBaseUrl is required.");
    }
}
