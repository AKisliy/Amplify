using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Publisher.Application.Publications.Commands.RegisterMediaPost;
using Contracts.Events;

namespace Publisher.Infrastructure.Consumers;

public class FinalAssetGeneratedConsumer(
    IMediator mediator,
    ILogger<FinalAssetGeneratedConsumer> logger) : IConsumer<FinalAssetGenerated>
{
    public async Task Consume(ConsumeContext<FinalAssetGenerated> context)
    {
        var msg = context.Message;

        logger.LogInformation(
            "Received FinalAssetGenerated: id={Id} mediaId={MediaId} projectId={ProjectId}",
            msg.Id, msg.MediaId, msg.ProjectId);

        await mediator.Send(new RegisterMediaPostCommand(msg.Id, msg.UserId, msg.ProjectId, msg.MediaId));
    }
}
