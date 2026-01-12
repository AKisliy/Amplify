using Publisher.Core.Common;
using Publisher.Core.Enums;

namespace Publisher.Core.Entities;

public class SocialMediaAccount : BaseAuditableEntity<Guid>
{
    public Guid ActorId { get; set; }

    public string ProviderUserId { get; set; } = null!;

    public string AccessToken { get; set; } = null!;

    public SocialMedia SocialMedia { get; set; }

    public virtual Actor Actor { get; set; } = null!;

    public virtual ICollection<AutoList> AutoLists { get; set; } = [];
}