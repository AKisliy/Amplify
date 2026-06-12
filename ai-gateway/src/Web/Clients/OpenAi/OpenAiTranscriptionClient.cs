using System.ClientModel;
using AiGateway.Web.Configuration;
using AiGateway.Web.Services;
using AiGateway.Web.Utils;
using OpenAI;
using OpenAI.Audio;

namespace AiGateway.Web.Clients.OpenAi;

public class OpenAiTranscriptionClient(
    IOptions<LiteLlmOptions> llmOptions,
    IOptions<OpenAiOptions> options,
    SrtBuilder srtBuilder)
{
    private readonly AudioClient _client = new OpenAIClient(
            new ApiKeyCredential(llmOptions.Value.ApiKey),
            new OpenAIClientOptions { Endpoint = new Uri(llmOptions.Value.BaseUrl) })
        .GetAudioClient(options.Value.TranscriptionModel);

    private readonly int _defaultMaxWords = options.Value.DefaultMaxWordsPerSegment;
    private readonly int _defaultMaxChars = options.Value.DefaultMaxCharsPerSegment;

    public async Task<TranscriptionResult> TranscribeAsync(
        Stream audioStream,
        string fileName,
        string? language,
        int? maxWordsPerSegment,
        int? maxCharsPerSegment,
        CancellationToken cancellationToken)
    {
        var transcriptionOptions = new AudioTranscriptionOptions
        {
            ResponseFormat = AudioTranscriptionFormat.Verbose,
            TimestampGranularities = AudioTimestampGranularities.Word,
            Language = language
        };

        var result = await _client.TranscribeAudioAsync(
            audioStream,
            fileName,
            transcriptionOptions,
            cancellationToken);

        var maxWords = maxWordsPerSegment ?? _defaultMaxWords;
        var maxChars = maxCharsPerSegment ?? _defaultMaxChars;

        var srtText = srtBuilder.BuildSrt(result.Value.Words, maxWords, maxChars);
        return new TranscriptionResult(srtText);
    }
}
