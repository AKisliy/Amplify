namespace UserService.Domain.Entities;

public class Ambassador : BaseAuditableEntity
{
    public required string Name { get; set; }

    public string? Biography { get; set; }

    public string? BehavioralPatterns { get; set; }

    public Guid ProjectId { get; set; }

    public virtual Project? Project { get; set; }
}
