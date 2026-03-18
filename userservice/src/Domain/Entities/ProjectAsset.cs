namespace UserService.Domain.Entities;

public class ProjectAsset : BaseAuditableEntity
{
    public Guid MediaId { get; set; }

    public Guid ProjectId { get; set; }

    public AssetLifetime Lifetime { get; set; }
}
