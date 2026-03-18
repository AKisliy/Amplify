namespace Contracts;

public class ProjectAssetGenerated : IAuditableMessage
{
    public Guid ProjectId { get; set; }

    public Guid MediaId { get; set; }

    public Guid UserId { get; set; }
}
