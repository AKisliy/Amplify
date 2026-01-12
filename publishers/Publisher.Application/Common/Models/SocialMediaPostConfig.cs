using Publisher.Core.Entities;

namespace Publisher.Application.Common.Models;

public record SocialMediaPostConfig
(
    string PostFileKey,
    string? Description,
    string? CoverFileKey,
    SocialMediaAccount Account,
    PublicationSettings PublicationSettings
);

