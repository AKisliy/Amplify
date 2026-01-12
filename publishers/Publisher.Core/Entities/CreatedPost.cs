using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class CreatedPost : BaseAuditableEntity<Guid>
{
    public string FileKey { get; set; } = null!;

    public string CoverFileKey { get; set; } = null!;

    public string Description { get; set; } = string.Empty;

    public Guid PostContainerId { get; set; }

    public virtual PostContainer PostContainer { get; set; } = null!;
}
