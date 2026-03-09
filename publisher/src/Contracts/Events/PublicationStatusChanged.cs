namespace Contracts.Events;

public class PublicationStatusChanged
{
    public required string UserId { get; set; }

    public Guid PublicationRecordId { get; set; }

    // TODO: consider switching to enum
    public required string Status { get; set; }

    public string? PublicUrl { get; set; }

    public string? PublicationErrorMessage { get; set; }
}

