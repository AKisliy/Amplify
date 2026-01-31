namespace Publisher.Application.Common.Options;

public class ExternalUrlsOptions
{
    public const string SecionName = "ExternalUrls";

    public string MediaServiceApi { get; set; } = string.Empty;
}

public class ExternalUrlsOptionsValidator : AbstractValidator<ExternalUrlsOptions>
{
    public ExternalUrlsOptionsValidator()
    {
        RuleFor(x => x.MediaServiceApi)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("MediaServiceApi must be a valid absolute URI.");
    }
}
