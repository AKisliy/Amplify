using MediaIngest.Domain.Enums;
using MediaIngest.Domain.Events;

namespace MediaIngest.Domain.Entities;

public class MediaFile : BaseAuditableEntity<Guid>
{
    public string FileKey { get; set; } = string.Empty;

    public string? OriginalFileName { get; set; }

    public string? ContentType { get; set; }

    public long FileSize { get; set; }

    public MediaProcessingStatus ProcessingStatus { get; set; } = MediaProcessingStatus.PendingUpload;

    public Guid? ParentMediaId { get; set; }

    public MediaVariant? Variant { get; set; }

    public void CompleteUpload()
    {
        ProcessingStatus = MediaProcessingStatus.Uploaded;

        // Variants are already processed — no need to trigger the processing pipeline
        if (ParentMediaId is null)
        {
            AddDomainEvent(new FileUploadCompleted
            {
                MediaId = Id,
                ContentType = ContentType ?? string.Empty,
                FileKey = FileKey,
            });
        }
    }
}
