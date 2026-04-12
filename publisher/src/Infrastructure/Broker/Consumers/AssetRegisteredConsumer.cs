using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Publisher.Application.Publications.Commands.RegisterMediaPost;
using Contracts.Events;

namespace Publisher.Infrastructure.Broker.Consumers;

public class AssetRegisteredConsumer(
    IMediator mediator,
    ILogger<AssetRegisteredConsumer> logger) : IConsumer<AssetRegistered>
{
    public async Task Consume(ConsumeContext<AssetRegistered> context)
    {
        var msg = context.Message;

        logger.LogInformation(
            "Received AssetRegistered event: id={Id} mediaId={MediaId} projectId={ProjectId}",
            msg.Id, msg.MediaId, msg.ProjectId);

        await mediator.Send(new RegisterMediaPostCommand(msg.Id, msg.UserId, msg.ProjectId, msg.MediaId, msg.AutoListIds));
    }
}
