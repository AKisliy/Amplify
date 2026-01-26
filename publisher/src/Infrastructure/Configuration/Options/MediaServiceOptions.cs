using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class MediaServiceOptions
{
    public const string ConfigurationSection = "MediaService";

    public required string BaseUrl { get; set; }
}

public sealed class MediaServiceOptionsValidator : AbstractValidator<MediaServiceOptions>
{
    public MediaServiceOptionsValidator()
    {
        RuleFor(x => x.BaseUrl)
            .NotEmpty().WithMessage("Media service base URL must be provided.")
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("Media service base URL must be a valid absolute URI.");
    }
}
