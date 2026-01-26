namespace Publisher.Domain.Entities;

// This entity is used when media was published
public class PublicationRecord : BaseAuditableEntity
{
    public Guid MediaPostId { get; set; }

    public Guid SocialAccountId { get; set; }
    public SocialProvider Provider { get; set; }
    public string ExternalPostId { get; set; } = string.Empty;

    public string PublicUrl { get; set; } = null!;

    public int LikesCount { get; set; }

    public int ViewsCount { get; set; }

    public int CommentsCount { get; set; }

    public int SharesCount { get; set; }

    public string? RawStatsJson { get; set; }

    public DateTime? StatsUpdatedAt { get; set; }

    public virtual MediaPost MediaPost { get; set; } = null!;
}