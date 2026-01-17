using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public record UploadFromFileCommand(Stream FileStream, string FileName, string ContentType)
    : IRequest<UploadFileDto>;

public class UploadFromFileCommandHandler(IFileStorage fileStorage, IApplicationDbContext dbContext)
    : IRequestHandler<UploadFromFileCommand, UploadFileDto>
{

    public async Task<UploadFileDto> Handle(UploadFromFileCommand request, CancellationToken cancellationToken)
    {
        var fileKey = await fileStorage.SaveFileAsync(request.FileStream, request.FileName, cancellationToken);

        var mediaFile = new MediaFile
        {
            FileKey = fileKey,
            OriginalFileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileStream.Length
        };

        dbContext.MediaFiles.Add(mediaFile);

        await dbContext.SaveChangesAsync(cancellationToken);

        var publicUrl = await fileStorage.GetPublicUrlAsync(mediaFile, TimeSpan.FromHours(1), cancellationToken);
        return new UploadFileDto
        {
            MediaId = mediaFile.Id,
            MediaPath = publicUrl
        };
    }
}
