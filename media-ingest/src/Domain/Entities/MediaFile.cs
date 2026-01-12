namespace MediaIngest.Domain.Entities;

public class MediaFile : BaseAuditableEntity<Guid>
{
    public string FileKey { get; set; } = string.Empty;

    public FileType? FileType { get; set; }
}
