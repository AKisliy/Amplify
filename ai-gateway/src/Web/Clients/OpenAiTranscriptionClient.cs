using AiGateway.Web.Configuration;
using AiGateway.Web.Endpoints;
using OpenAI.Audio;

namespace AiGateway.Web.Clients;

public class OpenAiTranscriptionClient(IOptions<OpenAiOptions> options)
{
    private readonly AudioClient _client = new(
        options.Value.TranscriptionModel,
        options.Value.ApiKey);

    public async Task<TranscriptionResult> TranscribeAsync(
        Stream audioStream,
        string fileName,
        string? language,
        CancellationToken cancellationToken)
    {
        var transcriptionOptions = new AudioTranscriptionOptions
        {
            ResponseFormat = AudioTranscriptionFormat.Srt,
            Language = language
        };

        var result = await _client.TranscribeAudioAsync(
            audioStream,
            fileName,
            transcriptionOptions,
            cancellationToken);

        return new TranscriptionResult(result.Value.Text);
    }
}
