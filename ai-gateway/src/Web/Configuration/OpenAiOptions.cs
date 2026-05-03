namespace AiGateway.Web.Configuration;

public class OpenAiOptions
{
    public const string ConfigurationSection = "OpenAi";

    public required string ApiKey { get; init; }
    public string BaseUrl { get; init; } = "https://api.openai.com";
    public string TranscriptionModel { get; init; } = "whisper-1";
    public int DefaultMaxWordsPerSegment { get; init; } = 6;
    public int DefaultMaxCharsPerSegment { get; init; } = 40;
}

public class OpenAiOptionsValidator : AbstractValidator<OpenAiOptions>
{
    public OpenAiOptionsValidator()
    {
        RuleFor(x => x.ApiKey).NotEmpty();
        RuleFor(x => x.BaseUrl).NotEmpty();
    }
}
