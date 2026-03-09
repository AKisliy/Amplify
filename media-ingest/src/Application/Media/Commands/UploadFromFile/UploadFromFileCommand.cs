using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;
using MediaIngest.Domain.Events;

namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public record UploadFromFileCommand(
    Stream FileStream,
    string FileName,
    string ContentType,
    long FileSize,
    FileType FileType)
    : IRequest<UploadFileDto>;

public class UploadFromFileCommandHandler(IFileStorage fileStorage, IApplicationDbContext dbContext)
    : IRequestHandler<UploadFromFileCommand, UploadFileDto>
{
    public async Task<UploadFileDto> Handle(UploadFromFileCommand request, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(request.FileName);
        var uniqueKey = $"{Guid.NewGuid()}{extension}";
        var fileKey = await fileStorage.SaveFileAsync(request.FileStream, uniqueKey, cancellationToken);

        var mediaFile = new MediaFile
        {
            FileKey = fileKey,
            OriginalFileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileSize
        };

        if (request.FileType == FileType.Video)
            mediaFile.AddDomainEvent(new VideoFileCreatedEvent(mediaFile, fileKey));

        dbContext.MediaFiles.Add(mediaFile);

        await dbContext.SaveChangesAsync(cancellationToken);

        var publicUrl = await fileStorage.GetPresignedUrlAsync(mediaFile, TimeSpan.FromHours(1), cancellationToken);
        return new UploadFileDto
        {
            MediaId = mediaFile.Id,
            MediaPath = publicUrl,
            ContentType = mediaFile.ContentType
        };
    }
}
