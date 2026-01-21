using FluentValidation;

namespace Publisher.Infrastructure.Configuration;

public class InstagramApiOptions
{
    public const string ConfigurationSection = "InstagramApiOptions";

    public required string AppId { get; init; }
    public required string AppSecret { get; init; }
    public required string RedirectUri { get; init; }

    public string ApiVersion { get; init; } = "v22.0";
    public int DailyLimit { get; init; } = 50;
    public string BaseGraphHostUrl { get; init; } = "https://graph.facebook.com";
    public string ResumableUploadHostUrl { get; init; } = "https://rupload.facebook.com";

    public class ContainerStatusQuerying
    {
        public int DelayMs { get; init; } = 60_000;
        public int Attempts { get; set; } = 5;
    }
}

public sealed class InstagramApiOptionsValidator : AbstractValidator<InstagramApiOptions>
{
    public InstagramApiOptionsValidator()
    {
        RuleFor(x => x.AppId)
            .NotEmpty();
        RuleFor(x => x.AppSecret)
            .NotEmpty();
        RuleFor(x => x.RedirectUri)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("RedirectUri must be a valid absolute URI.");
    }
}

