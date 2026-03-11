namespace Contracts;

public class ProjectCreatedEvent
{
    public Guid ProjectId { get; set; }

    public Guid UserId { get; set; }
}
