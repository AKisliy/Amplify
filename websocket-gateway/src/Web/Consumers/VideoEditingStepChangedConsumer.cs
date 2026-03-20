using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.VideoEditor;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;

namespace WebSocketGateway.Web.Consumers;

public class VideoEditingStepChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    ILogger<VideoEditingStepChangedConsumer> logger)
    : IConsumer<VideoEditingStepChanged>
{
    public async Task Consume(ConsumeContext<VideoEditingStepChanged> context)
    {
        var message = context.Message;

        logger.LogInformation(
            "Video editing step changed: VideoId={VideoId} NodeId={NodeId} Step={Step} Status={Status}",
            message.VideoId, message.NodeId, message.Step, message.Status);

        await hubContext.Clients.User(message.UserId).OnVideoEditingStepChanged(
            message.VideoId,
            message.NodeId,
            message.Step,
            message.Status,
            message.Error);
    }
}
