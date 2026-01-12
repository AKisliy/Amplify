using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class RabbitMQOptions
{
    public const string ConfigurationSection = "RabbitMQOptions";

    public string Host { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string Password { get; set; } = null!;
}

public sealed class RabbitMQOptionsValidator : AbstractValidator<RabbitMQOptions>
{
    public RabbitMQOptionsValidator()
    {
        RuleFor(x => x.Host)
            .NotEmpty();

        RuleFor(x => x.Username)
            .NotEmpty();

        RuleFor(x => x.Password)
            .NotEmpty();
    }
}
