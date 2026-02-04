namespace Contracts.Events;

public class ProjectCreated
{
    // TODO: set default json serializer for all MassTransit events
    public Guid Id { get; set; }

    // TODO: Add this to project entity as well (we'll be used for checking)
    public Guid UserId { get; set; }
}
