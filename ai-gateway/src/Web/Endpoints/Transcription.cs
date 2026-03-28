using AiGateway.Web.Services;

namespace AiGateway.Web.Endpoints;

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
        OpenAiService openAiService,
        CancellationToken cancellationToken)
    {
        var result = await openAiService.TranscribeAsync(request, cancellationToken);

        return Results.Ok(result);
    }
}