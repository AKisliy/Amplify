namespace AiGateway.Web.Configuration;

public class MediaIngestOptions
{
    public const string ConfigurationSection = "MediaIngest";

    public required string BaseUrl { get; init; }
}

public class MediaIngestOptionsValidator : AbstractValidator<MediaIngestOptions>
{
    public MediaIngestOptionsValidator()
    {
        RuleFor(x => x.BaseUrl).NotEmpty();
    }
}
