using MediaIngest.Domain.Enums;

namespace MediaIngest.Domain.Entities;

public class MediaFile : BaseAuditableEntity<Guid>
{
    public string FileKey { get; set; } = string.Empty;

    public string? OriginalFileName { get; set; }

    public string? ContentType { get; set; }

    public long FileSize { get; set; }

    public MediaProcessingStatus ProcessingStatus { get; set; } = MediaProcessingStatus.PendingUpload;
}
