namespace MediaIngest.Domain.Common;

public interface IBaseEntity
{
    public IReadOnlyCollection<BaseEvent> DomainEvents { get; }

    public void ClearDomainEvents();
}
