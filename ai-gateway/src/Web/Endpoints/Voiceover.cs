using AiGateway.Web.Clients;
using AiGateway.Web.Clients.ElevenLabs.Models;
using AiGateway.Web.Configuration;

namespace AiGateway.Web.Endpoints;

public record VoiceoverRequest
{
    /// <summary>
    /// Presigned URL to the source audio file.
    /// </summary>
    public required string PresignedUrl { get; init; }

    /// <summary>
    /// ElevenLabs voice ID to apply.
    /// </summary>
    public required string VoiceId { get; init; }
}

public record VoiceoverResult(Guid AudioId, string PresignedUrl);

public static class VoiceoverEndpoints
{
    public static void MapVoiceoverEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/voiceover", HandleAsync)
            .WithSummary("Apply voice-over to audio via ElevenLabs speech-to-speech")
            .Produces<VoiceoverResult>()
            .ProducesProblem(StatusCodes.Status502BadGateway);
    }

    private static async Task<IResult> HandleAsync(
        VoiceoverRequest request,
        ElevenLabsService elevenLabsService,
        IOptions<MediaIngestOptions> mediaIngestOptions,
        CancellationToken cancellationToken)
    {
        try
        {
            var (audioId, presignedUrl) = await elevenLabsService.SpeechToSpeechAsync(
                request.PresignedUrl,
                request.VoiceId,
                cancellationToken);

            return Results.Ok(new VoiceoverResult(audioId, presignedUrl));
        }
        catch (HTTPValidationError ex)
        {
            var errors = ex.Detail?.Select(d => new { d.Loc, d.Msg, d.Type }).ToList();
            return Results.Problem(
                title: "ElevenLabs validation error",
                detail: System.Text.Json.JsonSerializer.Serialize(errors),
                statusCode: StatusCodes.Status502BadGateway);
        }
    }
}
