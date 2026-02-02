using Publisher.Domain.Events.Publications;

namespace Publisher.Domain.Entities;

// This entity is used when media was published
public class PublicationRecord : BaseAuditableEntity
{
    public Guid MediaPostId { get; set; }

    public Guid SocialAccountId { get; set; }

    public SocialProvider Provider { get; set; }

    public PublicationStatus Status { get; set; }

    // TODO: should be updated after publication
    public string? ExternalPostId { get; set; }

    public string? PublicUrl { get; set; }

    public string? PublicationErrorMessage { get; set; }

    public int LikesCount { get; set; }

    public int ViewsCount { get; set; }

    public int CommentsCount { get; set; }

    public int SharesCount { get; set; }

    public string? RawStatsJson { get; set; }

    public DateTime? StatsUpdatedAt { get; set; }

    public virtual MediaPost MediaPost { get; set; } = null!;

    public virtual SocialAccount SocialAccount { get; set; } = null!;

    public void StartProcessing()
    {
        Status = PublicationStatus.Processing;
        AddDomainEvent(new PublicationRecordStatusChangedEvent(this));
    }

    public void MarkAsPublished(string publicUrl)
    {
        Status = PublicationStatus.Published;
        PublicUrl = publicUrl;
        AddDomainEvent(new PublicationRecordStatusChangedEvent(this));
    }

    public void MarkAsFailed(string errorMessage)
    {
        Status = PublicationStatus.Failed;
        PublicationErrorMessage = errorMessage;
        AddDomainEvent(new PublicationRecordStatusChangedEvent(this));
    }
}