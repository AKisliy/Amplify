using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models.Instagram;

public record InstagramPublishedVideoMedata(
    string LinkText,
    Guid CreatedVideoId,
    PublicationStatus Status);