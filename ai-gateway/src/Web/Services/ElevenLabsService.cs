using AiGateway.Web.Clients.ElevenLabs;
using AiGateway.Web.Clients.ElevenLabs.V1.SpeechToSpeech.Item.StreamNamespace;
using Microsoft.Kiota.Abstractions;

namespace AiGateway.Web.Services;

public class ElevenLabsService(
    ElevenLabsClient elevenlabsClient,
    IHttpClientFactory httpClientFactory,
    MediaIngestService mediaIngestService)
{
    private const string DefaultModelId = "eleven_multilingual_sts_v2";

    public async Task<(Guid AudioId, string PresignedUrl)> SpeechToSpeechAsync(
        string presignedUrl,
        string voiceId,
        CancellationToken cancellationToken = default)
    {
        var http = httpClientFactory.CreateClient();

        var sourceResponse = await http.GetAsync(
            presignedUrl,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        sourceResponse.EnsureSuccessStatusCode();
        await using var sourceStream = await sourceResponse.Content.ReadAsStreamAsync(cancellationToken);

        var body = new MultipartBody();
        body.AddOrReplacePart("audio", "audio/mpeg", sourceStream, "audio.mp3");
        body.AddOrReplacePart("model_id", "text/plain", DefaultModelId);

        await using var resultStream = await elevenlabsClient.V1.SpeechToSpeech[voiceId].Stream.PostAsync(body, config =>
        {
            config.QueryParameters.OutputFormatAsPostOutputFormatQueryParameterType = PostOutput_formatQueryParameterType.Mp3_22050_32;
            config.QueryParameters.EnableLogging = false;
        }, cancellationToken);

        Guard.Against.Null(resultStream, nameof(resultStream), "ElevenLabs returned null stream");

        var buffered = new MemoryStream();
        await resultStream.CopyToAsync(buffered, cancellationToken);
        buffered.Position = 0;

        return await mediaIngestService.UploadMediaAsync(buffered, "audio.mp3", cancellationToken);
    }
}
