using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Domain.Entities;

public class AutoList : BaseAuditableEntity
{
    public string Name { get; set; } = null!;

    public Guid ProjectId { get; set; }

    public PublicationSettings PublicationSettings { get; set; } = new PublicationSettings();

    public virtual Project Project { get; set; } = null!;

    public virtual ICollection<AutoListEntry> Entries { get; set; } = [];

    public virtual ICollection<SocialAccount> Accounts { get; set; } = [];
}
