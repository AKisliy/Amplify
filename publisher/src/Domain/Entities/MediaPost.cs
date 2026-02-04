namespace Publisher.Domain.Entities;

public class MediaPost : BaseAuditableEntity
{
    public Guid ProjectId { get; set; }

    public Guid MediaId { get; set; }

    // TODO: not sure, if cover could be uploaded via URL 
    public Guid? CoverMediaId { get; set; }

    public string? Description { get; set; }

    public PublicationStatus Status { get; set; }

    public PublicationType PublicationType { get; set; }

    public DateTime? PublishedAt { get; set; }

    public Guid? AutoListId { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual AutoList? AutoList { get; set; }
}
