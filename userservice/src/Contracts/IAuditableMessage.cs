namespace Contracts;

public interface IAuditableMessage
{
    public Guid UserId { get; set; }
}
