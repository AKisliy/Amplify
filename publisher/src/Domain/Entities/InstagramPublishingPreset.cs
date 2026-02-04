namespace Publisher.Domain.Entities;

public class InstagramPublishingPreset : BaseAuditableEntity
{
    public bool ShareToFeed { get; set; }

    public Guid AutoListId { get; set; }

    public virtual AutoList AutoList { get; set; } = null!;
}
