using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.Configuration;

public class YtDlpOptions
{
    public const string ConfigurationSection = "YtDlp";

    public string YoutubeDLPath { get; set; } = string.Empty;

    public string InstagramCookiesPath { get; set; } = string.Empty;
}

public sealed class YtDlpOptionsValidator : AbstractValidator<YtDlpOptions>
{
    public YtDlpOptionsValidator(ILogger<YtDlpOptions> logger)
    {
        RuleFor(x => x.InstagramCookiesPath)
            .Must(pth =>
            {
                if (string.IsNullOrEmpty(pth))
                    logger.LogWarning("Instagram cookies are not specified, this can cause issues, while downloading restricted content");
                return true;
            });

        RuleFor(x => x.YoutubeDLPath)
            .NotEmpty();

    }
}
