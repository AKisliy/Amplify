using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;

namespace WebSocketGateway.Web.Consumers;

public class NodeExecutionStatusChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    ILogger<NodeExecutionStatusChangedConsumer> logger)
    : IConsumer<NodeExecutionStatusChanged>
{
    public Task Consume(ConsumeContext<NodeExecutionStatusChanged> context)
    {
        var message = context.Message;

        logger.LogInformation(
            "Node execution status changed: NodeId={NodeId} Status={Status}",
            message.NodeId, message.Status);

        if (!Guid.TryParse(message.UserId, out var _))
        {
            logger.LogWarning("Invalid UserId in message: {UserId}", message.UserId);
            return Task.CompletedTask;
        }

        if (!Guid.TryParse(message.NodeId, out var _))
        {
            logger.LogWarning("Invalid NodeId in message: {NodeId}", message.NodeId);
            return Task.CompletedTask;
        }

        return hubContext.Clients.User(message.UserId).OnNodeExecutionStatusChanged(
            message.NodeId,
            message.Status,
            message.Outputs.HasValue ? message.Outputs.Value : null,
            message.Error);
    }
}
