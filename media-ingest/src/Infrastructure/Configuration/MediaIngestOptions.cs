namespace MediaIngest.Infrastructure.Configuration;

public class MediaIngestOptions
{
    public const string SectionName = "MediaIngest";

    public string? BasePath { get; set; }
}

public sealed class MediaIngestOptionsValidator : AbstractValidator<MediaIngestOptions>;
