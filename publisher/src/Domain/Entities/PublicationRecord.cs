using Publisher.Domain.Enums;
using Publisher.Domain.Events.Publications;

namespace Publisher.Domain.Entities;

public class PublicationRecord : BaseAuditableEntity
{
    public Guid MediaPostId { get; set; }

    public Guid SocialAccountId { get; set; }

    public SocialProvider Provider { get; set; }

    public PublicationStatus Status { get; set; }

    public string? Description { get; set; }

    public PublicationType PublicationType { get; set; } = PublicationType.Manual;

    /// <summary>When the record is scheduled to be published (AutoList only).</summary>
    public DateTimeOffset? ScheduledAt { get; set; }

    /// <summary>Actual time the post was published successfully.</summary>
    public DateTimeOffset? PublishedAt { get; set; }

    /// <summary>The AutoList entry (slot) this record is tied to.</summary>
    public Guid? AutoListEntryId { get; set; }

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
        PublishedAt = DateTimeOffset.UtcNow;
        AddDomainEvent(new PublicationRecordStatusChangedEvent(this));
    }

    public void MarkAsFailed(string errorMessage)
    {
        Status = PublicationStatus.Failed;
        PublicationErrorMessage = errorMessage;
        AddDomainEvent(new PublicationRecordStatusChangedEvent(this));
    }
}