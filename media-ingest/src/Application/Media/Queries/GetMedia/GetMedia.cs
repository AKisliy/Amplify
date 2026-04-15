using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Queries.GetMedia;

public record GetMediaQuery(Guid MediaId, MediaVariant Variant = MediaVariant.Original) : IRequest<MediaFileDto>;

internal class GetMediaQueryHandler(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage)
    : IRequestHandler<GetMediaQuery, MediaFileDto>
{
    private static readonly TimeSpan PresignedUrlExpiry = TimeSpan.FromHours(1);

    public async Task<MediaFileDto> Handle(GetMediaQuery request, CancellationToken cancellationToken)
    {
        var mediaFile = request.Variant == MediaVariant.Original
            ? await dbContext.MediaFiles
                .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken)
            : await dbContext.MediaFiles
                .FirstOrDefaultAsync(m => m.ParentMediaId == request.MediaId && m.Variant == request.Variant, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        var url = await fileStorage.GetPresignedUrlAsync(mediaFile.FileKey, PresignedUrlExpiry, cancellationToken);

        return new MediaFileDto { MediaId = mediaFile.Id, MediaPath = url };
    }
}
