using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class PostContainer : BaseAuditableEntity<Guid>
{
    public Guid ActorId { get; set; }

    public Guid? LastPublishedPostId { get; set; }

    public virtual Actor Actor { get; set; } = null!;

    public virtual CreatedPost? LastPublishedPost { get; set; }
}
