using MediaIngest.Domain.Events;

namespace MediaIngest.Domain.Entities;

public class MediaFile : BaseAuditableEntity<Guid>
{
    public string FileKey { get; set; } = string.Empty;

    public string? OriginalFileName { get; set; }

    public string? ContentType { get; set; }

    public long FileSize { get; set; }

    public MediaProcessingStatus ProcessingStatus { get; set; } = MediaProcessingStatus.PendingUpload;

    public string? ThumbnailTinyKey { get; set; }

    public string? ThumbnailMediumKey { get; set; }

    public void CompleteUpload()
    {
        ProcessingStatus = MediaProcessingStatus.Uploaded;

        AddDomainEvent(new FileUploadCompleted
        {
            MediaId = Id,
            ContentType = ContentType ?? string.Empty,
            FileKey = FileKey,
        });
    }
}
