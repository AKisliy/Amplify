using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;
using WebSocketGateway.Web.State;

namespace WebSocketGateway.Web.Consumers;

public class GraphCompletedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    JobNotificationStateManager stateManager,
    ILogger<GraphCompletedConsumer> logger)
    : IConsumer<GraphCompleted>
{
    public Task Consume(ConsumeContext<GraphCompleted> context)
    {
        var msg = context.Message;

        if (!Guid.TryParse(msg.UserId, out var _))
        {
            logger.LogWarning("Invalid UserId in GraphCompleted: {UserId}", msg.UserId);
            return Task.CompletedTask;
        }

        var state = stateManager.GetOrCreate(msg.JobId);
        lock (state)
        {
            if (state.Status == JobNotificationStatus.Done)
            {
                // AssetRegistered already arrived — user already got the done toast, skip loading
                logger.LogInformation("GraphCompleted for {JobId}: AssetRegistered already processed, skipping loading toast", msg.JobId);
                return Task.CompletedTask;
            }

            state.Status = JobNotificationStatus.Loading;
        }

        logger.LogInformation("GraphCompleted for {JobId}: sending loading toast to user {UserId}", msg.JobId, msg.UserId);
        return hubContext.Clients.User(msg.UserId).OnJobCompleted(msg.JobId);
    }
}
