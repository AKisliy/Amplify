using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.CompleteUploadCommand;

public class CompleteUploadCommandHandler(IApplicationDbContext dbContext)
    : IRequestHandler<CompleteUploadCommand>
{
    public async Task Handle(CompleteUploadCommand request, CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        mediaFile.ProcessingStatus = MediaProcessingStatus.Uploaded;

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
