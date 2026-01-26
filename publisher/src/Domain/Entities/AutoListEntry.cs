namespace Publisher.Domain.Entities;

public class AutoListEntry : BaseAuditableEntity
{
    public Guid AutoListId { get; set; }

    public int DayOfWeeks { get; set; }

    public TimeOnly PublicationTime { get; set; }

    public virtual AutoList AutoList { get; set; } = null!;
}
