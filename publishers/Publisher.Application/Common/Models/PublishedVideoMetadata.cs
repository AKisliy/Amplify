using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models;

public class PublishedVideoMetadata
{
    string LinkText { get; } = null!;
    Guid CreatedVideoId { get; }
    PublicationStatus Status { get; }
}
