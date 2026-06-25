using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.State;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Infrastructure.Broker.Consumers;

public class NodeExecutionStatusChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    NodeNotificationStateManager stateManager,
    IApplicationDbContext db,
    ITelegramNotifier telegram,
    IUserPresenceChecker presence,
    ILogger<NodeExecutionStatusChangedConsumer> logger)
    : IConsumer<NodeExecutionStatusChanged>
{
    public async Task Consume(ConsumeContext<NodeExecutionStatusChanged> context)
    {
        var message = context.Message;

        logger.LogInformation(
            "Node execution status changed: NodeId={NodeId} JobId={JobId} Status={Status}",
            message.NodeId, message.JobId, message.Status);

        if (!Guid.TryParse(message.UserId, out var userId))
        {
            logger.LogWarning("Invalid UserId in message: {UserId}", message.UserId);
            return;
        }

        if (!Guid.TryParse(message.NodeId, out var _))
        {
            logger.LogWarning("Invalid NodeId in message: {NodeId}", message.NodeId);
            return;
        }

        if (!stateManager.TryTransition(message.NodeId, message.JobId, message.Status))
        {
            logger.LogInformation(
                "Suppressed stale status {Status} for NodeId={NodeId} JobId={JobId}",
                message.Status, message.NodeId, message.JobId);
            return;
        }

        await hubContext.Clients.User(message.UserId).OnNodeExecutionStatusChanged(
            message.NodeId,
            message.Status,
            message.Outputs.HasValue ? message.Outputs.Value : null,
            message.Error);

        await SendTelegramIfEnabledAsync(message, userId, context.CancellationToken);
    }

    private async Task SendTelegramIfEnabledAsync(NodeExecutionStatusChanged msg, Guid userId, CancellationToken ct)
    {
        var isError = msg.Status.Equals("FAILURE", StringComparison.OrdinalIgnoreCase);
        var isHitl = msg.Status.Equals("WAITING_FOR_REVIEW", StringComparison.OrdinalIgnoreCase);

        if (!isError && !isHitl) return;

        var settings = await db.NotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (settings?.TelegramChatId is null) return;
        if (settings.NotifyOnlyWhenOffline && presence.IsOnline(userId)) return;

        // Per-node override takes precedence over global flag
        var shouldNotify = isError
            ? (msg.Notify ?? settings.NotifyOnError)
            : (msg.Notify ?? settings.NotifyOnHitl);

        if (!shouldNotify) return;

        var text = isError
            ? $"❌ Ошибка в ноде {msg.NodeId}: {msg.Error}"
            : $"👀 Нода {msg.NodeId} ожидает проверки";

        await telegram.SendMessageAsync(settings.TelegramChatId.Value, text, ct);
    }
}
