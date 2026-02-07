using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class PublisherOptions
{
    public const string ConfigurationSection = "PublisherOptions";

    public string BasePath { get; set; } = string.Empty;
}

public sealed class PublisherOptionsValidator : AbstractValidator<PublisherOptions>
{
    public PublisherOptionsValidator()
    {
    }
}
