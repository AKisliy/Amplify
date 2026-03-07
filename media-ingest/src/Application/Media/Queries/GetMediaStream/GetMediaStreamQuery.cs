using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Queries.GetMediaStream;

public record GetMediaStreamQuery(Guid MediaId) : IRequest<MediaStreamDto>;

public record MediaStreamDto(Stream Stream, string ContentType);

internal class GetMediaStreamQueryHandler(IApplicationDbContext dbContext, IFileStorage fileStorage)
    : IRequestHandler<GetMediaStreamQuery, MediaStreamDto>
{
    public async Task<MediaStreamDto> Handle(GetMediaStreamQuery request, CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        var stream = await fileStorage.OpenFileAsync(mediaFile.FileKey, cancellationToken);
        var contentType = mediaFile.ContentType ?? "application/octet-stream";

        return new MediaStreamDto(stream, contentType);
    }
}
