using MediaIngest.Domain.Entities;

namespace MediaIngest.Domain.Events;

public class VideoFileCreatedEvent(MediaFile mediaFile, string fileKey) : BaseEvent
{
    public MediaFile MediaFile { get; } = mediaFile;
    public string FileKey { get; } = fileKey;
}
