using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Common.Interfaces;

public interface ILinkGenerator
{
    LinkType SupportedLinkType { get; }
    Task<string> GenerateLinkAsync(Guid mediaId, LinkType linkType, CancellationToken cancellationToken = default, bool includeMetadata = true);
}
