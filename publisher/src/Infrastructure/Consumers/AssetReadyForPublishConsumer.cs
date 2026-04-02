using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Publisher.Application.Publications.Commands.PublishFromCanvas;
using Contracts.Events;

namespace Publisher.Infrastructure.Consumers;

public class AssetReadyForPublishConsumer(
    IMediator mediator,
    ILogger<AssetReadyForPublishConsumer> logger) : IConsumer<AssetReadyForPublish>
{
    public async Task Consume(ConsumeContext<AssetReadyForPublish> context)
    {
        var mediaId = context.Message.MediaId;
        var autoListId = context.Message.AutoListId;

        logger.LogInformation(
            "Received AssetReadyForPublish: mediaId={MediaId}, autoListId={AutoListId}",
            mediaId, autoListId);

        await mediator.Send(new PublishFromCanvasCommand(mediaId, autoListId));
    }
}
