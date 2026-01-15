namespace UserService.Domain.Entities;

public class Project : BaseAuditableEntity
{
    public required string Name { get; set; }

    public string? Description { get; set; }

    public string? Photo { get; set; }

    public Guid UserId { get; set; }
}
