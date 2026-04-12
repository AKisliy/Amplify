namespace MediaIngest.Domain.Events;

public class FileUploadCompleted : BaseEvent
{
    public Guid MediaId { get; init; }

    public required string ContentType { get; set; }

    public required string FileKey { get; init; }
}
