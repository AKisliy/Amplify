using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class FrontendOptions
{
    public const string ConfigurationSection = "Frontend";

    public required string BaseUrl { get; set; }

    public required string ConnectionsPath { get; set; }
}

public class FrontendOptionsValidator : AbstractValidator<FrontendOptions>
{
    public FrontendOptionsValidator()
    {
        RuleFor(x => x.BaseUrl)
            .NotEmpty()
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("BaseUrl must be a valid absolute URI");

        RuleFor(x => x.ConnectionsPath)
            .NotEmpty()
            .Must(path => path.StartsWith("/"))
            .WithMessage("ConnectionsPath must start with a '/'");
    }
}
