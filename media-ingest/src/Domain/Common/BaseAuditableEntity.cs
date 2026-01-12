namespace MediaIngest.Domain.Common;

public abstract class BaseAuditableEntity<TKey> : BaseEntity<TKey>, IAuditableEntity
{
    public DateTime CreatedAt { get; set; }

    public DateTime ModifiedAt { get; set; }
}
