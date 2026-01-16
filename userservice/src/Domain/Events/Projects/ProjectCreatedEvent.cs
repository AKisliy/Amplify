namespace UserService.Domain.Events.Projects;

public class ProjectCreatedEvent : BaseEvent
{
    public Project Project { get; set; }

    public ProjectCreatedEvent(Project entity)
    {
        Project = entity;
    }
}
