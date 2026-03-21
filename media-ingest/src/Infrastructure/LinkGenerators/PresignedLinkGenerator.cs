using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;
using Microsoft.Extensions.Configuration;

namespace MediaIngest.Infrastructure.LinkGenerators;

public class PresignedLinkGenerator(
    IFileStorage fileStorage,
    IApplicationDbContext dbContext,
    IConfiguration configuration) : ILinkGenerator
{
    public LinkType SupportedLinkType => LinkType.Presigned;

    public async Task<string> GenerateLinkAsync(Guid mediaId, LinkType linkType, CancellationToken cancellationToken)
    {
        var mediaFile = dbContext.MediaFiles.FirstOrDefault(m => m.Id == mediaId);

        Guard.Against.NotFound(mediaId, mediaFile, $"Media file with ID {mediaId} not found.");

        var expiryMinutes = configuration.GetValue<int>("PresignedUrl:ExpiryMinutes", 60);
        var presignedUrl = await fileStorage.GetPresignedUrlAsync(mediaFile, TimeSpan.FromMinutes(expiryMinutes), cancellationToken);
        return presignedUrl;
    }
}
