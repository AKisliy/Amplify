using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Infrastructure.LinkGenerators;

public class PublicLinkGenerator(
    IFileStorage fileStorage,
    IApplicationDbContext dbContext) : ILinkGenerator
{
    public LinkType SupportedLinkType => LinkType.Public;

    public async Task<string> GenerateLinkAsync(Guid mediaId, LinkType linkType, CancellationToken cancellationToken = default, bool includeMetadata = true)
    {
        var mediaFile = dbContext.MediaFiles.FirstOrDefault(m => m.Id == mediaId);

        Guard.Against.NotFound(mediaId, mediaFile, $"Media file with ID {mediaId} not found.");

        var publicUrl = await fileStorage.GetPublicUrlAsync(mediaFile, cancellationToken);
        return publicUrl;
    }
}
