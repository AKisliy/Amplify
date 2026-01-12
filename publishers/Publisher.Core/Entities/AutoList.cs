using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class AutoList : BaseAuditableEntity<Guid>
{
    public string Name { get; set; } = null!;

    public Guid ActorId { get; set; }

    public Guid PostContainerId { get; set; }

    public virtual Actor Actor { get; set; } = null!;

    public virtual InstagramPublishingPreset? InstagramPreset { get; set; }

    public virtual PostContainer PostContainer { get; set; } = null!;

    public virtual ICollection<AutoListEntry> Entries { get; set; } = [];

    public virtual ICollection<SocialMediaAccount> Accounts { get; set; } = [];
}
