namespace Contracts;

public class AssetRegistered : IAuditableMessage
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public Guid UserId { get; set; }

    public Guid ProjectId { get; set; }

    public Guid MediaId { get; set; }

    public string MediaType { get; set; } = string.Empty;

    public List<Guid> AutoListIds { get; set; } = [];
}
