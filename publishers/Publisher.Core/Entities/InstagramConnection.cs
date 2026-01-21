using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class InstagramConnection : BaseEntity<Guid>
{
    public Guid UserId { get; set; }

    public string InstagramBusinessAccountId { get; set; } = null!;

    public string InstagramUsername { get; set; } = null!;

    public string FacebookPageId { get; set; } = null!;

    public string AccessToken { get; set; } = null!;

    public DateTime ConnectedAt { get; set; }

    public DateTime TokenExpiresAt { get; set; }
}
