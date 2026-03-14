using FluentValidation;

namespace UserService.Infrastructure.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Issuer { get; set; }

    public required string Audience { get; set; }

    public required string PrivateKeyPem { get; set; }
}

internal sealed class JwtOptionsValidator : AbstractValidator<JwtOptions>
{
    public JwtOptionsValidator()
    {
        RuleFor(x => x.Issuer)
            .NotEmpty()
            .WithMessage("Issuer is required.");

        RuleFor(x => x.Audience)
            .NotEmpty()
            .WithMessage("Audience is required.");

        RuleFor(x => x.PrivateKeyPem)
            .NotEmpty()
            .WithMessage("PrivateKeyPem is required.");
    }
}
