using MediaIngest.Application.Common.Interfaces;

namespace MediaIngest.Application.Media.Queries.GetUploadPresignedUrl;

public record GetUploadPresignedUrlQuery(Guid MediaId) : IRequest<GetUploadPresignedUrlResponse>;

internal class GetUploadPresignedUrlQueryHandler(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage)
    : IRequestHandler<GetUploadPresignedUrlQuery, GetUploadPresignedUrlResponse>
{
    public async Task<GetUploadPresignedUrlResponse> Handle(
        GetUploadPresignedUrlQuery request,
        CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(mediaFile));

        var uploadUrl = await fileStorage.GetPresignedUploadUrlAsync(
            mediaFile.FileKey,
            mediaFile.ContentType ?? "application/octet-stream",
            TimeSpan.FromMinutes(30),
            cancellationToken);

        return new GetUploadPresignedUrlResponse
        {
            MediaId = mediaFile.Id,
            UploadUrl = uploadUrl,
        };
    }
}
