using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using AiGateway.Web.Clients.ElevenLabs;
using AiGateway.Web.Clients.ElevenLabs.V1.SpeechToSpeech.Item.StreamNamespace;
using AiGateway.Web.Configuration;
using Microsoft.Kiota.Abstractions;

namespace AiGateway.Web.Clients;

public class ElevenLabsService(
    ElevenLabsClient elevenlabsClient,
    IHttpClientFactory httpClientFactory,
    IOptions<MediaIngestOptions> mediaIngestOptions)
{
    private const string DefaultModelId = "eleven_multilingual_sts_v2";

    public async Task<(Guid AudioId, string PresignedUrl)> SpeechToSpeechAsync(
        string presignedUrl,
        string voiceId,
        CancellationToken cancellationToken = default)
    {
        var http = httpClientFactory.CreateClient();

        // 1. Download source audio from presigned URL
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

        var resultContent = new StreamContent(resultStream!);
        resultContent.Headers.ContentType = MediaTypeHeaderValue.Parse("audio/mpeg");

        var uploadResponse = await http.PostAsync(
            $"{mediaIngestOptions.Value.BaseUrl}/api/internal/media/",
            new MultipartFormDataContent { { resultContent, "file", $"{Guid.NewGuid()}.mp3" } },
            cancellationToken);
        uploadResponse.EnsureSuccessStatusCode();

        var result = await uploadResponse.Content.ReadFromJsonAsync<MediaUploadResult>(
            cancellationToken: cancellationToken);

        return (result!.MediaId, result.MediaPath);
    }
}

file record MediaUploadResult(
    [property: JsonPropertyName("mediaId")] Guid MediaId,
    [property: JsonPropertyName("mediaPath")] string MediaPath,
    [property: JsonPropertyName("contentType")] string ContentType);
