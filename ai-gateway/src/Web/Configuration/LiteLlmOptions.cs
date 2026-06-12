namespace AiGateway.Web.Configuration;

public class LiteLlmOptions
{
    public const string SectionName = "LiteLLM";

    /// <summary>
    /// Base URL for the LiteLLM API.
    /// </summary>
    public required string BaseUrl { get; init; }

    /// <summary>
    /// API key for authenticating with the LiteLLM API.
    /// </summary>
    public required string ApiKey { get; init; }
}

public class LiteLlmOptionsValidator : AbstractValidator<LiteLlmOptions>
{
    public LiteLlmOptionsValidator()
    {
        RuleFor(x => x.ApiKey).NotEmpty().WithMessage("LiteLLM API key is required.");

        RuleFor(x => x.BaseUrl)
            .NotEmpty()
            .WithMessage("LiteLLM BaseUrl is required.")
            .Must(uri => Uri.IsWellFormedUriString(uri, UriKind.Absolute))
            .WithMessage("LiteLLM BaseUrl is not a valid URI.");
    }
}
