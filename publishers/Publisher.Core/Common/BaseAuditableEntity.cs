namespace Publisher.Core.Common;

public abstract class BaseAuditableEntity<TEntityId> : BaseEntity<TEntityId>, IAuditableEntity
{
    public DateTime CreatedAt { get; set; }

    public DateTime ModifiedAt { get; set; }
}

