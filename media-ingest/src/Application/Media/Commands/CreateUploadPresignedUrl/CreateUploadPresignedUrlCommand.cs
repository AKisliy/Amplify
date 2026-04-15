using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;

public record CreateUploadPresignedUrlCommand(
    string FileName,
    string ContentType,
    long FileSize,
    Guid? ParentMediaId = null,
    MediaVariant? Variant = null)
    : IRequest<CreateUploadPresignedUrlDto>;

public class CreateUploadPresignedUrlCommandHandler(
    IFileStorage fileStorage,
    IApplicationDbContext dbContext)
    : IRequestHandler<CreateUploadPresignedUrlCommand, CreateUploadPresignedUrlDto>
{
    public async Task<CreateUploadPresignedUrlDto> Handle(
        CreateUploadPresignedUrlCommand request,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(request.FileName);
        var fileKey = $"{Guid.NewGuid()}{extension}";

        if (request.ParentMediaId != null)
        {
            var parentId = request.ParentMediaId.Value;
            var parentMedia = await dbContext.MediaFiles.FindAsync([parentId], cancellationToken);
            Guard.Against.NotFound(parentId, parentMedia, nameof(MediaFile));
        }

        var mediaFile = new MediaFile
        {
            FileKey = fileKey,
            OriginalFileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileSize,
            ParentMediaId = request.ParentMediaId,
            Variant = request.Variant,
        };

        dbContext.MediaFiles.Add(mediaFile);
        await dbContext.SaveChangesAsync(cancellationToken);

        var uploadUrl = await fileStorage.GetPresignedUploadUrlAsync(
            fileKey,
            request.ContentType,
            TimeSpan.FromMinutes(30),
            cancellationToken);

        return new CreateUploadPresignedUrlDto
        {
            MediaId = mediaFile.Id,
            UploadUrl = uploadUrl,
        };
    }
}
