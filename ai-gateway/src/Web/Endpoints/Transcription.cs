using AiGateway.Web.Clients;
using AiGateway.Web.Configuration;

namespace AiGateway.Web.Endpoints;

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

public static class TranscriptionEndpoints
{
    public static void MapTranscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/transcribe", HandleAsync)
            .WithSummary("Transcribe audio/video")
            .Produces<TranscriptionResult>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status502BadGateway);
    }

    private static async Task<IResult> HandleAsync(
        TranscribeRequest request,
        OpenAiTranscriptionClient transcriptionClient,
        IHttpClientFactory httpClientFactory,
        IOptions<MediaIngestOptions> mediaIngestOptions,
        CancellationToken cancellationToken)
    {
        var http = httpClientFactory.CreateClient();

        // Stream file directly to OpenAI
        var fileResponse = await http.GetAsync(
            request.PresignedUrl,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        fileResponse.EnsureSuccessStatusCode();

        var fileName = $"{Guid.NewGuid()}.mp3";
        await using var audioStream = await fileResponse.Content.ReadAsStreamAsync(cancellationToken);

        var result = await transcriptionClient.TranscribeAsync(audioStream, fileName, request.Language, cancellationToken);

        return Results.Ok(result);
    }
}

file record MediaLinkResponse(Guid MediaId, string Link);
