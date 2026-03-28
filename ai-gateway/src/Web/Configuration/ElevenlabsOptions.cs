namespace AiGateway.Web.Configuration;

public class ElevenlabsOptions
{
    public const string ConfigurationSection = "Elevenlabs";

    public required string ApiKey { get; set; }

    public string BaseUrl { get; set; } = "https://api.elevenlabs.io";
}

public class ElevenlabsOptionsValidator : AbstractValidator<ElevenlabsOptions>
{
    public ElevenlabsOptionsValidator()
    {
        RuleFor(x => x.ApiKey).NotEmpty().WithMessage("Elevenlabs API key is required.");
    }
}