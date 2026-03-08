using MediaIngest.Domain.Common;

namespace MediaIngest.Domain.Events;

public class VideoFileCreatedEvent(Guid mediaId) : BaseEvent
{
    public Guid MediaId { get; } = mediaId;
}
