using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public class AutoListEntry : BaseAuditableEntity<Guid>
{
    public Guid AutoListId { get; set; }

    public int DayOfWeeks { get; set; }

    public TimeOnly PublicationTime { get; set; }

    public virtual AutoList AutoList { get; set; } = null!;
}
