using FluentValidation;
using Flurl;

namespace WebSocketGateway.Web.Configuration;

public class RabbitMQOptions
{
    public const string ConfigurationSection = "RabbitMQ";

    public required string Url { get; set; }
}

public sealed class RabbitMQOptionsValidator : AbstractValidator<RabbitMQOptions>
{
    public RabbitMQOptionsValidator()
    {
        RuleFor(x => x.Url)
            .Must(Url.IsValid)
            .WithMessage("Url must be a well-formed URL");
    }
}

