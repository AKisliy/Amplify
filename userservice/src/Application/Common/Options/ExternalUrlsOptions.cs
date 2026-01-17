namespace UserService.Application.Common.Options;

public class ExternalUrlsOptions
{
    public const string SectionName = "ExternalUrls";

    public required string MediaServiceApi { get; set; }
}
