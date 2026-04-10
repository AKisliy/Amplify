using MediaIngest.Application.Media.Commands.CompleteUploadCommand;
using MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;
using MediaIngest.Application.Media.Queries.GetMedia;
using MediaIngest.Domain.Enums;
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
            .Produces<CreateUploadPresignedUrlDto>(StatusCodes.Status201Created)
            .RequireAuthorization();

        groupBuilder.MapPost("/{mediaId:guid}/upload-completed", CompleteUpload)
            .WithSummary("Confirm upload completion")
            .WithDescription("Called by the client after a successful direct S3 upload. Marks the file as uploaded and triggers preprocessing.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .RequireAuthorization();
    }

    public async Task<RedirectHttpResult> GetMediaById(ISender sender, Guid mediaId, MediaVariant variant = MediaVariant.Original)
    {
        var mediaDto = await sender.Send(new GetMediaQuery(mediaId, variant));
        return TypedResults.Redirect(mediaDto.MediaPath);
    }

    public async Task<Created<CreateUploadPresignedUrlDto>> GetPresignedUploadUrl(ISender sender, CreateUploadPresignedUrlCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/media/{result.MediaId}", result);
    }

    public async Task<NoContent> CompleteUpload(ISender sender, Guid mediaId)
    {
        await sender.Send(new CompleteUploadCommand(mediaId));
        return TypedResults.NoContent();
    }
}
