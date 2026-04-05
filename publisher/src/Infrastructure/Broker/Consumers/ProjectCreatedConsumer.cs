using Contracts.Events;
using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Publisher.Application.Projects.Commands.AddProject;

namespace Publisher.Infrastructure.Broker.Consumers;

public class ProjectCreatedConsumer(
    IMediator mediator,
    ILogger<ProjectCreatedConsumer> logger) : IConsumer<ProjectCreated>
{
    public async Task Consume(ConsumeContext<ProjectCreated> context)
    {
        var projectId = context.Message.ProjectId;
        var userId = context.Message.UserId;
        logger.LogInformation("Consumed event for {ProjectId}", projectId);

        var publishNextVideoCommand = new AddProjectCommand(projectId, userId);

        await mediator.Send(publishNextVideoCommand);
    }
}

