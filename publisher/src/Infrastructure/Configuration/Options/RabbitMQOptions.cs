using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class RabbitMQOptions
{
    public const string ConfigurationSection = "RabbitMQOptions";

    public required string Host { get; set; }

    public required string Username { get; set; }

    public required string Password { get; set; }
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
