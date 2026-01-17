using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Commands.DeleteMedia;

public record DeleteMediaCommand(Guid MediaId) : IRequest;

public class DeleteMediaCommandHandler(IApplicationDbContext dbContext, IFileStorage fileStorage)
    : IRequestHandler<DeleteMediaCommand>
{
    public async Task Handle(DeleteMediaCommand request, CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        await fileStorage.DeleteFileAsync(mediaFile.FileKey, cancellationToken);

        dbContext.MediaFiles.Remove(mediaFile);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
