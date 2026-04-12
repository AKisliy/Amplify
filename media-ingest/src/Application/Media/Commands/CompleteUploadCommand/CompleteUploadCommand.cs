using MediaIngest.Application.Common.Interfaces;

namespace MediaIngest.Application.Media.Commands.CompleteUploadCommand;

public record CompleteUploadCommand(Guid MediaId) : IRequest;

public class CompleteUploadCommandHandler(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage)
    : IRequestHandler<CompleteUploadCommand>
{
    public async Task Handle(CompleteUploadCommand request, CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles.FindAsync(new object[] { request.MediaId }, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(request.MediaId));

        var fileExists = await fileStorage.FileExistsAsync(mediaFile.FileKey, cancellationToken);
        if (!fileExists)
        {
            throw new InvalidOperationException("Uploaded file not found in storage.");
        }

        mediaFile.CompleteUpload();
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}