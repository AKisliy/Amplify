using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;

namespace WebSocketGateway.Web.Consumers;

public class GraphCompletedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    ILogger<GraphCompletedConsumer> logger)
    : IConsumer<GraphCompleted>
{
    public Task Consume(ConsumeContext<GraphCompleted> context)
    {
        var message = context.Message;

        logger.LogInformation(
            "Graph completed: JobId={JobId} TemplateId={TemplateId} MediaId={MediaId} MediaType={MediaType}",
            message.JobId, message.TemplateId, message.MediaId, message.MediaType);

        if (!Guid.TryParse(message.UserId, out var _))
        {
            logger.LogWarning("Invalid UserId in message: {UserId}", message.UserId);
            return Task.CompletedTask;
        }

        return hubContext.Clients.User(message.UserId).OnGraphCompleted(
            message.JobId,
            message.TemplateId,
            message.MediaId,
            message.MediaType);
    }
}
