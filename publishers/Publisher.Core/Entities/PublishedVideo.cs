using Publisher.Core.Common;
using Publisher.Core.Enums;

namespace Publisher.Core.Entities;

public class PublishedVideo : BaseAuditableEntity<Guid>
{
    public Guid CreatedVideoId { get; set; }

    public SocialMedia SocialMedia { get; set; }

    public string LinkText { get; set; } = null!;

    public PublicationStatus Status { get; set; }
}
