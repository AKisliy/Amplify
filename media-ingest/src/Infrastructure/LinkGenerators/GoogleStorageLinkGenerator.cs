using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MediaIngest.Infrastructure.LinkGenerators;

public class GoogleStorageLinkGenerator(IApplicationDbContext dbContext, IOptions<S3Options> options) : ILinkGenerator
{
    public LinkType SupportedLinkType => LinkType.GoogleCloudStorage;

    public async Task<string> GenerateLinkAsync(Guid mediaId, LinkType linkType, CancellationToken cancellationToken = default)
    {
        var mediaFile = await dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);

        Guard.Against.NotFound(mediaId, mediaFile, nameof(MediaFile));

        var link = $"gs://{options.Value.BucketName}/{mediaFile.FileKey}";

        return link;
    }
}
