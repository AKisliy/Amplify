using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface IPublishedVideoMetadata
{
    string LinkText { get; }
    Guid CreatedVideoId { get; }
    PublicationStatus Status { get; }
}

