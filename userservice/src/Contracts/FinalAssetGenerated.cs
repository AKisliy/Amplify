namespace Contracts;

public class FinalAssetGenerated : IAuditableMessage
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public Guid UserId { get; set; }

    public Guid ProjectId { get; set; }

    public Guid TemplateId { get; set; }

    public Guid MediaId { get; set; }

    public string MediaType { get; set; } = string.Empty;

    public List<Guid> AutoListIds { get; set; } = [];

    public string? Description { get; set; }
}
