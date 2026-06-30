using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using NotificationSettingsEntity = WebSocketGateway.Domain.Entities.NotificationSettings;

namespace WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;

public record ConfirmTelegramLinkCommand(string Token, long ChatId, string? Username)
    : IRequest<bool>;

public class ConfirmTelegramLinkCommandHandler(
    IApplicationDbContext db,
    ITelegramLinkTokenCache tokenCache,
    ITelegramNotifier telegramNotifier
) : IRequestHandler<ConfirmTelegramLinkCommand, bool>
{
    public async Task<bool> Handle(
        ConfirmTelegramLinkCommand request,
        CancellationToken cancellationToken
    )
    {
        if (!tokenCache.TryConsume(request.Token, out var userId))
            return false;

        var settings = await db.NotificationSettings.FirstOrDefaultAsync(
            s => s.UserId == userId,
            cancellationToken
        );

        if (settings is null)
        {
            settings = new NotificationSettingsEntity { UserId = userId };
            db.NotificationSettings.Add(settings);
        }

        settings.TelegramChatId = request.ChatId;
        settings.TelegramUsername = request.Username;

        await telegramNotifier.SendMessageAsync(
            request.ChatId,
            "Your Telegram account has been successfully linked to your Amplify account.",
            cancellationToken
        );

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
