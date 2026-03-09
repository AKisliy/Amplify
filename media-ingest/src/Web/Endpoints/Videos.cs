
using MediaIngest.Application.Media.Commands.UploadFromFile;
using MediaIngest.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Videos : EndpointGroupBase
{
    public override string? GroupName => "videos";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/", UploadFromFile)
            .Accepts<IFormFile>("multipart/form-data")
            .DisableAntiforgery()
            .RequireAuthorization()
            .WithSummary("Upload a video")
            .WithDescription("Accepts MP4 and WebM. Max size: 100 MB. Returns the assigned mediaId and presigned URL.")
            .Produces<UploadFileDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }

    public async Task<Created<UploadFileDto>> UploadFromFile(ISender sender, IFormFile file)
    {
        var command = new UploadFromFileCommand(
            file.OpenReadStream(),
            file.FileName,
            file.ContentType,
            file.Length,
            FileType.Video);

        var result = await sender.Send(command);
        return TypedResults.Created($"/media/{result.MediaId}", result);
    }
}
