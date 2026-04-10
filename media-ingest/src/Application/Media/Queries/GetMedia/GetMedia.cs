using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Application.Media.Queries.GetMedia;

public record GetMediaQuery(Guid MediaId, MediaVariant Variant = MediaVariant.Original) : IRequest<MediaFileDto>;

internal class GetMediaQueryHandler(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage,
    ILogger<GetMediaQueryHandler> logger)
    : IRequestHandler<GetMediaQuery, MediaFileDto>
{
    private static readonly TimeSpan PresignedUrlExpiry = TimeSpan.FromHours(1);

    public async Task<MediaFileDto> Handle(GetMediaQuery request, CancellationToken cancellationToken)
    {
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        var resolvedKey = ResolveKey(mediaFile, request.Variant);
        var url = await fileStorage.GetPresignedUrlAsync(resolvedKey, PresignedUrlExpiry, cancellationToken);

        return new MediaFileDto { MediaId = mediaFile.Id, MediaPath = url };
    }

    private string ResolveKey(MediaFile mediaFile, MediaVariant variant)
    {
        var key = variant switch
        {
            MediaVariant.Tiny   => mediaFile.ThumbnailTinyKey,
            MediaVariant.Medium => mediaFile.ThumbnailMediumKey,
            _                   => null,
        };

        if (key is not null)
            return key;

        if (variant != MediaVariant.Original)
            logger.LogWarning(
                "Thumbnail not ready for MediaId={MediaId}, Variant={Variant}. Falling back to original.",
                mediaFile.Id, variant);

        return mediaFile.FileKey;
    }
}
