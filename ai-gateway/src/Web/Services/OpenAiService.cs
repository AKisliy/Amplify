using AiGateway.Web.Clients.OpenAi;

namespace AiGateway.Web.Services;

public class TranscribeRequest
{
    /// <summary>
    /// Presigned URL to the media file to transcribe. The file should be in a format supported by OpenAI (e.g. mp3, mp4, wav).
    /// </summary>
    public required string PresignedUrl { get; set; }

    /// <summary>
    /// Optional language hint for the transcription. Should be an ISO 639-1 code (e.g. "en" for English, "es" for Spanish). 
    /// This can help improve accuracy if the language is known in advance.
    /// </summary>
    public string? Language { get; set; }
}

public record TranscriptionResult(string SrtText);

public class OpenAiService(
    IHttpClientFactory httpClientFactory,
    OpenAiTranscriptionClient transcriptionClient)
{
    public async Task<TranscriptionResult> TranscribeAsync(TranscribeRequest request, CancellationToken cancellationToken)
    {
        var http = httpClientFactory.CreateClient();

        var fileResponse = await http.GetAsync(
            request.PresignedUrl,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        fileResponse.EnsureSuccessStatusCode();

        var fileName = $"{Guid.NewGuid()}.mp3";
        var buffered = new MemoryStream();
        await fileResponse.Content.CopyToAsync(buffered, cancellationToken);
        buffered.Position = 0;

        var result = await transcriptionClient.TranscribeAsync(buffered, fileName, request.Language, cancellationToken);

        return result;
    }
}
