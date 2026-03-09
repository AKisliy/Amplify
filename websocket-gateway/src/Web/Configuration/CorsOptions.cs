using FluentValidation;

namespace WebSocketGateway.Web.Configuration;

public class CorsOptions
{
    public const string SectionName = "CorsOptions";

    public IReadOnlyList<string> AllowedOrigins { get; set; } = [];

    public required string DefaultPolicyName { get; set; }
}

public class CorsOptionsValidator : AbstractValidator<CorsOptions>
{
    public CorsOptionsValidator()
    {
        RuleFor(x => x.DefaultPolicyName)
            .NotEmpty();

        RuleFor(x => x.AllowedOrigins)
            .NotEmpty()
            .WithMessage("Allowed orgins weren't provided");

    }
}
