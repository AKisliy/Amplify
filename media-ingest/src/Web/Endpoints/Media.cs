using MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;
using MediaIngest.Application.Media.Queries.GetMedia;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Media : EndpointGroupBase
{
    public override string? GroupName => "media";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("/{mediaId:guid}", GetMediaById)
            .WithSummary("Get media by ID")
            .WithDescription("Redirects to the CDN URL of the media file. Use the URL directly in <img src> or <video src>.")
            .Produces(StatusCodes.Status302Found)
            .ProducesProblem(StatusCodes.Status404NotFound);

        groupBuilder.MapPost("/presigned-upload", GetPresignedUploadUrl)
            .WithSummary("Get presigned upload URL")
            .WithDescription("Registers a new media record and returns a presigned PUT URL for direct S3 upload. To upload to S3 please use exact ContentType header.")
            .Produces<CreateUploadPresignedUrlDto>(StatusCodes.Status201Created);
    }

    public async Task<RedirectHttpResult> GetMediaById(ISender sender, Guid mediaId)
    {
        var mediaDto = await sender.Send(new GetMediaQuery(mediaId));
        return TypedResults.Redirect(mediaDto.MediaPath);
    }

    public async Task<Created<CreateUploadPresignedUrlDto>> GetPresignedUploadUrl(ISender sender, CreateUploadPresignedUrlCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/media/{result.MediaId}", result);
    }
}
