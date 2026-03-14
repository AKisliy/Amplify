namespace UserService.Application.Common.Options;

public class ExternalUrlsOptions
{
    public const string SectionName = "ExternalUrls";

    public required string MediaServiceApi { get; set; }
}

internal sealed class ExternalUrlsOptionsValidator : AbstractValidator<ExternalUrlsOptions>
{
    public ExternalUrlsOptionsValidator()
    {
        RuleFor(x => x.MediaServiceApi)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("MediaServiceApi is required.");
    }
}
