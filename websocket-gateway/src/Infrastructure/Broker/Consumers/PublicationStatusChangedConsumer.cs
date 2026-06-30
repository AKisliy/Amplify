using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Contracts.Publisher;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Infrastructure.Broker.Consumers;

public class PublicationStatusChangedConsumer(
    IHubContext<MainHub, IClientReceiver> hubContext,
    IApplicationDbContext db,
    ITelegramNotifier telegram,
    IUserPresenceChecker presence,
    ILogger<PublicationStatusChangedConsumer> logger
) : IConsumer<PublicationStatusChanged>
{
    public async Task Consume(ConsumeContext<PublicationStatusChanged> context)
    {
        var msg = context.Message;

        logger.LogInformation("Received new message about publication status!");

        await hubContext
            .Clients.User(msg.UserId)
            .OnPublicationStatusChanged(
                msg.PublicationRecordId,
                msg.Status.ToString(),
                msg.PublicUrl,
                msg.PublicationErrorMessage
            );

        if (
            msg.Status.ToString().Equals("Published", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(msg.UserId, out var userId)
        )
        {
            await SendTelegramIfEnabledAsync(userId, msg, context.CancellationToken);
        }
    }

    private async Task SendTelegramIfEnabledAsync(
        Guid userId,
        PublicationStatusChanged msg,
        CancellationToken ct
    )
    {
        var settings = await db.NotificationSettings.FirstOrDefaultAsync(
            s => s.UserId == userId,
            ct
        );

        if (settings?.TelegramChatId is null)
            return;
        if (!settings.NotifyOnPublication)
            return;
        if (settings.NotifyOnlyWhenOffline && presence.IsOnline(userId))
            return;

        await telegram.SendMessageAsync(
            settings.TelegramChatId.Value,
            $"📢 Публикация в социальную сеть прошла успешно! [Посмотреть публикацию]({msg.PublicUrl})",
            ct
        );
    }
}
