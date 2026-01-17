
using MediaIngest.Application.Media.Commands.UploadFromFile;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Images : EndpointGroupBase
{
    public override string? GroupName => "images";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/from-file", UploadFromFile);
    }

    public async Task<Created<UploadFileDto>> UploadFromFile(ISender sender, IFormFile file)
    {
        var command = new UploadFromFileCommand(file.OpenReadStream(), file.FileName, file.ContentType);
        var result = await sender.Send(command);
        return TypedResults.Created($"/media/{result.MediaId}", result);
    }
}
