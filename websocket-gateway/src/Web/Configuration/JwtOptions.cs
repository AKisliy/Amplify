using FluentValidation;

namespace Infrastructure.Configuration;

public class JwtOptions
{
    public const string ConfigurationSection = "Jwt";

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;
}

public sealed class JwtOptionsValidator : AbstractValidator<JwtOptions>
{
    public JwtOptionsValidator()
    {
        RuleFor(x => x.Issuer).NotEmpty();
        RuleFor(x => x.Audience).NotEmpty();
    }
}

