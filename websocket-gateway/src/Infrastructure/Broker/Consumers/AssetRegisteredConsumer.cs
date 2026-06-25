using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.State;
using WebSocketGateway.Contracts.UserService;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Infrastructure.Broker.Consumers;

public class AssetRegisteredConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    JobNotificationStateManager stateManager,
    IApplicationDbContext db,
    ITelegramNotifier telegram,
    IUserPresenceChecker presence,
    ILogger<AssetRegisteredConsumer> logger)
    : IConsumer<AssetRegistered>
{
    public async Task Consume(ConsumeContext<AssetRegistered> context)
    {
        var msg = context.Message;

        if (!Guid.TryParse(msg.UserId, out var userId))
        {
            logger.LogWarning("Invalid UserId in AssetRegistered: {UserId}", msg.UserId);
            return;
        }

        var state = stateManager.GetOrCreate(msg.JobId);
        lock (state)
        {
            if (state.Status == JobNotificationStatus.Done)
            {
                logger.LogWarning("Duplicate AssetRegistered for job {JobId}, skipping", msg.JobId);
                return;
            }
            state.Status = JobNotificationStatus.Done;
        }

        stateManager.Remove(msg.JobId);

        logger.LogInformation(
            "AssetRegistered for {JobId}: sending done toast to user {UserId}, assetId={AssetId}",
            msg.JobId, msg.UserId, msg.Id);

        await hubContext.Clients.User(msg.UserId).OnAssetReady(
            msg.Id, msg.JobId, msg.ProjectId, msg.MediaId, msg.MediaType);

        await SendTelegramIfEnabledAsync(userId, msg.JobId, context.CancellationToken);
    }

    private async Task SendTelegramIfEnabledAsync(Guid userId, string jobId, CancellationToken ct)
    {
        var settings = await db.NotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (settings?.TelegramChatId is null) return;
        if (!settings.NotifyOnCompletion) return;
        if (settings.NotifyOnlyWhenOffline && presence.IsOnline(userId)) return;

        await telegram.SendMessageAsync(settings.TelegramChatId.Value,
            $"✅ Ваш контент готов! Job: {jobId}", ct);
    }
}
