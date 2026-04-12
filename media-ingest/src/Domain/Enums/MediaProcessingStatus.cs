namespace MediaIngest.Domain.Enums;

public enum MediaProcessingStatus
{
    PendingUpload = 0,
    Uploaded = 1,
    Processing = 2,
    Ready = 3,
    Failed = 4
}
