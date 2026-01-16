using Microsoft.Extensions.Logging;
using UserService.Domain.Events.Projects;

namespace UserService.Application.Projects.EventHandlers;

public class ProjectCreatedEventHandler(ILogger<ProjectCreatedEventHandler> logger)
    : INotificationHandler<ProjectCreatedEvent>
{
    public Task Handle(ProjectCreatedEvent notification, CancellationToken cancellationToken)
    {
        logger.LogInformation("Created project with id: {ProjectId}", notification.Project.Id);

        return Task.CompletedTask;
    }
}
