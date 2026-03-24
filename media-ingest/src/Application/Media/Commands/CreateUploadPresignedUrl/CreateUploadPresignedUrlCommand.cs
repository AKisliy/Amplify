using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;

public record CreateUploadPresignedUrlCommand(
    string FileName,
    string ContentType,
    long FileSize)
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

        var mediaFile = new MediaFile
        {
            FileKey = fileKey,
            OriginalFileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileSize,
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
