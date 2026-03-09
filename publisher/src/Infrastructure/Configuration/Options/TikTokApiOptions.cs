using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class TikTokApiOptions
{
    public const string ConfigurationSection = "TikTokApi";

    public required string ClientKey { get; set; }

    public required string ClientSecret { get; set; }

    public required string RedirectUri { get; set; }
}

public class TikTokApiOptionsValidator : AbstractValidator<TikTokApiOptions>
{
    public TikTokApiOptionsValidator()
    {
        RuleFor(x => x.ClientKey).NotEmpty();
        RuleFor(x => x.ClientSecret).NotEmpty();
        RuleFor(x => x.RedirectUri)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("RedirectUri must be a valid absolute URI");
    }
}
