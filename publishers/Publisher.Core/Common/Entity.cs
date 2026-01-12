namespace Publisher.Core.Common;

public abstract class BaseEntity<TEntityId>
{
    private readonly List<BaseEvent> _domainEvents = [];

    public TEntityId Id { get; set; }

    public IReadOnlyCollection<BaseEvent> GetDomainEvents() => _domainEvents.AsReadOnly();

    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
    }

    protected void Raise(BaseEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }
}
