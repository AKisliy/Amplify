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
            .RequireAuthorization();
        groupBuilder.MapPost("/import", UploadFromLink).RequireAuthorization();
    }

    public async Task<Created<UploadFileDto>> UploadFromFile(ISender sender, IFormFile file)
    {
        var command = new UploadFromFileCommand(file.OpenReadStream(), file.FileName, file.ContentType);
        var result = await sender.Send(command);
        return TypedResults.Created($"/media/{result.MediaId}", result);
    }

    public async Task<Created<UploadFileDto>> UploadFromLink(ISender sender, string link)
    {
        throw new NotImplementedException();
    }
}
