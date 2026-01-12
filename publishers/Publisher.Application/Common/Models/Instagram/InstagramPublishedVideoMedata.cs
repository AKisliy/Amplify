using Publisher.Application.Common.Interfaces;
using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models.Instagram;

public record InstagramPublishedVideoMedata
(
    string LinkText,
    Guid CreatedVideoId,
    PublicationStatus Status
) : IPublishedVideoMetadata;