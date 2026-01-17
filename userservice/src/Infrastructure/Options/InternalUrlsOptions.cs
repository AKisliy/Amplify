namespace UserService.Infrastructure.Options;

public class InternalUrlsOptions
{
    public const string SectionName = "InternalUrls";

    public required string MediaServiceInternalBaseUrl { get; set; }
}
