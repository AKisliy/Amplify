using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Application.Common.Models;

public record SocialMediaPostConfig(
    Guid PostFileId,
    string? Description,
    Guid? CoverFileId,
    Guid AccountId,
    PublicationSettings PublicationSettings);
