using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.UserService;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;
using WebSocketGateway.Web.State;

namespace WebSocketGateway.Web.Consumers;

public class AssetRegisteredConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    JobNotificationStateManager stateManager,
    ILogger<AssetRegisteredConsumer> logger)
    : IConsumer<AssetRegistered>
{
    public Task Consume(ConsumeContext<AssetRegistered> context)
    {
        var msg = context.Message;

        if (!Guid.TryParse(msg.UserId, out var _))
        {
            logger.LogWarning("Invalid UserId in AssetRegistered: {UserId}", msg.UserId);
            return Task.CompletedTask;
        }

        var state = stateManager.GetOrCreate(msg.JobId);
        lock (state)
        {
            if (state.Status == JobNotificationStatus.Done)
            {
                logger.LogWarning("Duplicate AssetRegistered for job {JobId}, skipping", msg.JobId);
                return Task.CompletedTask;
            }

            state.Status = JobNotificationStatus.Done;
        }

        stateManager.Remove(msg.JobId);

        logger.LogInformation(
            "AssetRegistered for {JobId}: sending done toast to user {UserId}, assetId={AssetId}",
            msg.JobId, msg.UserId, msg.Id);

        return hubContext.Clients.User(msg.UserId).OnAssetReady(
            msg.Id, msg.JobId, msg.ProjectId, msg.MediaId, msg.MediaType);
    }
}
