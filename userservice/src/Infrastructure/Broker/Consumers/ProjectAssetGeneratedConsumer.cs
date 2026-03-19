using Contracts;
using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using UserService.Application.ProjectAssets.Commands.AddProjectAsset;

namespace UserService.Infrastructure.Broker.Consumers;

internal class ProjectAssetGeneratedConsumer(
    IMediator mediator,
    ILogger<ProjectAssetGeneratedConsumer> logger) : IConsumer<ProjectAssetGenerated>
{
    public async Task Consume(ConsumeContext<ProjectAssetGenerated> context)
    {
        var projectId = context.Message.ProjectId;
        var userId = context.Message.UserId;
        logger.LogInformation("Consumed ProjectAssetGenerated event for {ProjectId}", projectId);

        var command = new AddProjectAssetCommand(projectId, context.Message.MediaId);

        await mediator.Send(command);
    }
}

