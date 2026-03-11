using FluentValidation;

namespace UserService.Infrastructure.Broker;

public class RabbitMQOptions
{
    public const string ConfigurationSection = "RabbitMQ";

    public required string Url { get; set; }
}

public sealed class RabbitMQOptionsValidator : AbstractValidator<RabbitMQOptions>
{
    public RabbitMQOptionsValidator()
    {
        RuleFor(x => x.Url).NotEmpty();
    }
}

