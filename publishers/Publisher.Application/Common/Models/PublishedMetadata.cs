using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models;

public record PublishedMetadata
(
    PublicationResult PublicationResult,
    Guid CreatedVideoId,
    SocialMedia SocialMedia
);

