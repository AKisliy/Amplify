using AiGateway.Web.Configuration;
using AiGateway.Web.Services;
using AiGateway.Web.Utils;
using OpenAI.Audio;

namespace AiGateway.Web.Clients.OpenAi;

public class OpenAiTranscriptionClient(IOptions<OpenAiOptions> options, SrtBuilder srtBuilder)
{
    private readonly AudioClient _client = new(
        options.Value.TranscriptionModel,
        options.Value.ApiKey);

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
