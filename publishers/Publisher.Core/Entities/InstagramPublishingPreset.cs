using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class InstagramPublishingPreset : BaseAuditableEntity<Guid>
{
    public bool ShareToFeed { get; set; }

    public Guid AutoListId { get; set; }

    public virtual AutoList AutoList { get; set; } = null!;
}
