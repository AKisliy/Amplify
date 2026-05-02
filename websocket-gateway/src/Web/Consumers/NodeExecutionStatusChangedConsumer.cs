using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;
using WebSocketGateway.Web.State;

namespace WebSocketGateway.Web.Consumers;

public class NodeExecutionStatusChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    NodeNotificationStateManager stateManager,
    ILogger<NodeExecutionStatusChangedConsumer> logger)
    : IConsumer<NodeExecutionStatusChanged>
{
    public Task Consume(ConsumeContext<NodeExecutionStatusChanged> context)
    {
        var message = context.Message;

        logger.LogInformation(
            "Node execution status changed: NodeId={NodeId} JobId={JobId} Status={Status}",
            message.NodeId, message.JobId, message.Status);

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

        if (!stateManager.TryTransition(message.NodeId, message.JobId, message.Status))
        {
            logger.LogInformation(
                "Suppressed stale status {Status} for NodeId={NodeId} JobId={JobId}",
                message.Status, message.NodeId, message.JobId);
            return Task.CompletedTask;
        }

        return hubContext.Clients.User(message.UserId).OnNodeExecutionStatusChanged(
            message.NodeId,
            message.Status,
            message.Outputs.HasValue ? message.Outputs.Value : null,
            message.Error);
    }
}
