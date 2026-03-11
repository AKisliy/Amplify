using MassTransit;
using Microsoft.Extensions.Logging;
using UserService.Domain.Events.Projects;

namespace UserService.Application.Projects.EventHandlers;

public class ProjectCreatedEventHandler(
    ILogger<ProjectCreatedEventHandler> logger,
    IBus bus)
    : INotificationHandler<ProjectCreatedEvent>
{
    public async Task Handle(ProjectCreatedEvent notification, CancellationToken cancellationToken)
    {
        logger.LogInformation("Created project with id: {ProjectId}", notification.Project.Id);

        var contractEvent = new Contracts.ProjectCreatedEvent
        {
            ProjectId = notification.Project.Id,
            UserId = notification.Project.UserId
        };

        await bus.Publish(contractEvent, cancellationToken);
    }
}
