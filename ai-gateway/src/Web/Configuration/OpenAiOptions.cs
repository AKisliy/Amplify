namespace AiGateway.Web.Configuration;

public class OpenAiOptions
{
    public const string ConfigurationSection = "OpenAi";

    public string TranscriptionModel { get; init; } = "whisper-1";
    public int DefaultMaxWordsPerSegment { get; init; } = 6;
    public int DefaultMaxCharsPerSegment { get; init; } = 40;
}

public class OpenAiOptionsValidator : AbstractValidator<OpenAiOptions>
{
    public OpenAiOptionsValidator()
    {
    }
}
