using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Queries.GetMedia;

public record GetMediaQuery(Guid MediaId) : IRequest<MediaFileDto>;

public class GetMediaQueryHandler(IApplicationDbContext dbContext, IFileStorage fileStorage)
    : IRequestHandler<GetMediaQuery, MediaFileDto>
{
    public async Task<MediaFileDto> Handle(GetMediaQuery request, CancellationToken cancellationToken)
    {
        // TODO: Add checks for user permissions
        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);

        Guard.Against.NotFound(request.MediaId, mediaFile, nameof(MediaFile));

        var publicUrl = await fileStorage.GetPublicUrlAsync(mediaFile, TimeSpan.FromHours(1), cancellationToken);

        return new MediaFileDto
        {
            MediaId = mediaFile.Id,
            MediaPath = publicUrl
        };
    }
}

