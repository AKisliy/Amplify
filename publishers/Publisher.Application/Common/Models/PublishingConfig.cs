using Publisher.Application.Common.Models.Dto;
using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models;

public record PublishingConfig
(
    CreatedVideoDto CreatedVideoDto,
    SocialMedia SocialMedia
);

