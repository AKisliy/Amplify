using MediaIngest.Application.Media.Commands.UploadFromFile;
using MediaIngest.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Images : EndpointGroupBase
{
    public override string? GroupName => "images";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/import", UploadFromLink)
            .RequireAuthorization()
            .WithSummary("Import an image from URL")
            .WithDescription("Downloads an image from an external URL and stores it. Not yet implemented.")
            .Produces<UploadFileDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status501NotImplemented);
    }

    public Task<Created<UploadFileDto>> UploadFromLink(ISender sender, string link)
    {
        throw new NotImplementedException();
    }
}
