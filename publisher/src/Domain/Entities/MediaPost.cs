using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Domain.Entities;

public class MediaPost : BaseAuditableEntity
{
    public Guid ProjectId { get; set; }

    public Guid MediaId { get; set; }

    // TODO: not sure, if cover could be uploaded via URL 
    public Guid? CoverMediaId { get; set; }

    public string? Description { get; set; }

    public PublicationType PublicationType { get; set; }

    public Guid? AutoListId { get; set; }

    public PublicationSettings PublicationSettings { get; set; } = new();

    public virtual ICollection<PublicationRecord> PublicationRecords { get; set; } = [];

    public virtual Project Project { get; set; } = null!;

    public virtual AutoList? AutoList { get; set; }
}
