using MediaIngest.Application.Media.Commands.UploadFromFile;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Images : EndpointGroupBase
{
    public override string? GroupName => "images";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(UploadFromFile)
            .Accepts<IFormFile>("multipart/form-data")
            .DisableAntiforgery()
            .RequireAuthorization()
            .WithSummary("Upload an image")
            .WithDescription("Accepts JPEG, PNG, WebP, GIF. Max size: 10 MB. Returns the assigned mediaId and public URL.")
            .Produces<UploadFileDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        groupBuilder.MapPost("/import", UploadFromLink)
            .RequireAuthorization()
            .WithSummary("Import an image from URL")
            .WithDescription("Downloads an image from an external URL and stores it. Not yet implemented.")
            .Produces<UploadFileDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status501NotImplemented);
    }

    public async Task<Created<UploadFileDto>> UploadFromFile(ISender sender, IFormFile file)
    {
        var command = new UploadFromFileCommand(
            file.OpenReadStream(),
            file.FileName,
            file.ContentType,
            file.Length);
        var result = await sender.Send(command);
        return TypedResults.Created($"/media/{result.MediaId}", result);
    }

    public Task<Created<UploadFileDto>> UploadFromLink(ISender sender, string link)
    {
        throw new NotImplementedException();
    }
}
