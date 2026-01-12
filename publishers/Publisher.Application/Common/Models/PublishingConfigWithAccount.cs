using Publisher.Application.Common.Models.Dto;
using Publisher.Core.Entities;

namespace Publisher.Application.Common.Models;

public record PublishingConfigWithAccount
(
    CreatedVideoDto CreatedVideoDto,
    SocialMediaAccount SocialMediaAccount
);
