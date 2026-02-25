using MassTransit;
using Microsoft.AspNetCore.SignalR;
using WebSocketGateway.Contracts.Publisher;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.Receivers;

namespace WebSocketGateway.Web.Consumers;

public class PublicationStatusChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    ILogger<PublicationStatusChangedConsumer> logger)
    : IConsumer<PublicationStatusChanged>
{
    public async Task Consume(ConsumeContext<PublicationStatusChanged> context)
    {
        var publicationRecord = context.Message;

        logger.LogInformation("Received new message about publication status!");

        await hubContext.Clients.User(publicationRecord.UserId).OnPublicationStatusChanged(
            publicationRecord.PublicationRecordId,
            publicationRecord.Status.ToString(),
            publicationRecord.PublicUrl,
            publicationRecord.PublicationErrorMessage);
    }
}
