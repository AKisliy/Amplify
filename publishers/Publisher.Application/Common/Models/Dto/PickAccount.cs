using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models.Dto;

public record PickAccount
(
    Guid CreatedVideoId,
    VideoFormat VideoFormat,
    SocialMedia SocialMedia
);
