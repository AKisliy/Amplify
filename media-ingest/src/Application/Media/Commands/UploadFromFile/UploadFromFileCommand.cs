using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public record UploadFromFileCommand(Stream FileStream, string FileName, string ContentType)
    : IRequest<UploadFileDto>;

public class UploadFromFileCommandHandler : IRequestHandler<UploadFromFileCommand, UploadFileDto>
{
    private readonly IFileStorage _fileStorage;
    private readonly IApplicationDbContext _dbContext;

    public UploadFromFileCommandHandler(IFileStorage fileStorage, IApplicationDbContext dbContext)
    {
        _fileStorage = fileStorage;
        _dbContext = dbContext;
    }

    public async Task<UploadFileDto> Handle(UploadFromFileCommand request, CancellationToken cancellationToken)
    {
        var fileKey = await _fileStorage.SaveFileAsync(request.FileStream, request.FileName, cancellationToken);

        var mediaFile = new MediaFile
        {
            FileKey = fileKey
        };

        _dbContext.MediaFiles.Add(mediaFile);

        await _dbContext.SaveChangesAsync(cancellationToken);

        var publicUrl = await _fileStorage.GetPublicUrlAsync(fileKey, TimeSpan.FromHours(1), cancellationToken);

        return new UploadFileDto
        {
            MediaId = mediaFile.Id,
            MediaPath = publicUrl
        };
    }
}
