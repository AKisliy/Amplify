using MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;
using MediaIngest.Application.Media.Commands.DeleteMedia;
using MediaIngest.Application.Media.Commands.ImportFromGoogleStorage;
using MediaIngest.Application.Media.Commands.ImportFromUrl;
using MediaIngest.Application.Media.Commands.UploadFromFile;
using MediaIngest.Application.Media.Queries.GetLinkById;
using MediaIngest.Application.Media.Queries.GetMediaStream;
using MediaIngest.Domain.Enums;
using MediaIngest.Web.Endpoints.Models;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

/// <summary>
/// Internal endpoints for service-to-service communication only.
/// Not exposed to external clients.
/// </summary>
public class Internal : EndpointGroupBase
{
    public override string? GroupName => "internal/media";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/", Upload)
            .Accepts<IFormFile>("multipart/form-data")
            .DisableAntiforgery()
            .WithSummary("Upload a file (internal)")
            .WithDescription("Service-to-service only. Stores any file type without auth. Returns mediaId for use in subsequent requests.")
            .Produces<UploadFileDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        groupBuilder.MapGet("/{mediaId:guid}/stream", Stream)
            .WithSummary("Stream file content (internal)")
            .WithDescription("Service-to-service only. Returns raw file bytes with the stored Content-Type header.")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        groupBuilder.MapDelete("/{mediaId:guid}", DeleteMediaById)
            .WithSummary("Delete media (internal)")
            .WithDescription("Service-to-service only. Permanently deletes the file from storage and removes the database record.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        groupBuilder.MapGet("/{mediaId:guid}/link", GetLinkById)
            .WithSummary("Get media URL (internal)")
            .WithDescription("Service-to-service only. Returns a URL for the media file based on the requested link type.")
            .Produces<GetLinkByIdResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        groupBuilder.MapPost("/import-url", ImportFromUrl)
            .WithSummary("Import file from external URL (internal)")
            .WithDescription("Service-to-service only. Downloads file from an external URL and stores it in S3. Returns mediaId.")
            .Produces<ImportFromUrlDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        groupBuilder.MapPost("/presigned-upload", CreatePresignedUpload)
            .WithSummary("Create presigned upload URL (internal)")
            .WithDescription("Service-to-service only. Registers a new media record and returns a presigned PUT URL for direct S3 upload.")
            .Produces<CreateUploadPresignedUrlDto>(StatusCodes.Status201Created);

        groupBuilder.MapPost("/import-gs", ImportFromGoogleStorage)
            .WithSummary("Import file from Google Storage (internal)")
            .WithDescription("Service-to-service only. Downloads file from Google Storage and stores it in S3. Returns mediaId.")
            .Produces<ImportFromUrlDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    public async Task<Created<UploadFileDto>> Upload(ISender sender, IFormFile file)
    {
        var command = new UploadFromFileCommand(
            file.OpenReadStream(),
            file.FileName,
            file.ContentType,
            file.Length,
            FileType.None);

        var result = await sender.Send(command);
        return TypedResults.Created($"/api/internal/media/{result.MediaId}/stream", result);
    }

    public async Task<FileStreamHttpResult> Stream(ISender sender, Guid mediaId)
    {
        var dto = await sender.Send(new GetMediaStreamQuery(mediaId));
        return TypedResults.Stream(dto.Stream, dto.ContentType);
    }

    public async Task<NoContent> DeleteMediaById(ISender sender, Guid mediaId)
    {
        await sender.Send(new DeleteMediaCommand(mediaId));
        return TypedResults.NoContent();
    }

    public async Task<GetLinkByIdResponse> GetLinkById(ISender sender, Guid mediaId, LinkType linkType)
    {
        var query = new GetLinkByIdQuery(mediaId, linkType);
        var response = await sender.Send(query);
        return response;
    }

    public async Task<Created<ImportFromUrlDto>> ImportFromUrl(ISender sender, [AsParameters] ImportFromUrlRequest request)
    {
        var result = await sender.Send(new ImportFromUrlCommand(request.Url));
        return TypedResults.Created($"/api/internal/media/{result.MediaId}/stream", result);
    }

    public async Task<Created<CreateUploadPresignedUrlDto>> CreatePresignedUpload(
        ISender sender,
        CreateUploadPresignedUrlCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/internal/media/{result.MediaId}/link", result);
    }

    public async Task<Created<ImportFromGoogleStorageResponse>> ImportFromGoogleStorage(ISender sender, ImportFromGoogleStorageCommand request)
    {
        var result = await sender.Send(request);
        return TypedResults.Created($"/api/internal/media/stream", result);
    }
}

