using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using NotificationSettingsEntity = WebSocketGateway.Domain.Entities.NotificationSettings;

namespace WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;

public record ConfirmTelegramLinkCommand(string Token, long ChatId, string? Username)
    : IRequest<bool>;

public class ConfirmTelegramLinkCommandHandler(
    IApplicationDbContext db,
    ITelegramLinkTokenCache tokenCache
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
        settings.TelegramUsername = request.Username is not null ? $"@{request.Username}" : null;

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
