using MediaIngest.Application.Media.Queries.GetMedia;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Media : EndpointGroupBase
{
    public override string? GroupName => "media";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("/{mediaId:guid}", GetMediaById)
            .RequireAuthorization()
            .WithSummary("Get media by ID")
            .WithDescription("Redirects to the CDN URL of the media file. Use the URL directly in <img src> or <video src>.")
            .Produces(StatusCodes.Status302Found)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }

    public async Task<RedirectHttpResult> GetMediaById(ISender sender, Guid mediaId)
    {
        var mediaDto = await sender.Send(new GetMediaQuery(mediaId));
        return TypedResults.Redirect(mediaDto.MediaPath);
    }
}
