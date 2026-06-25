using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Application.NotificationSettings.Commands.UnlinkTelegram;

public record UnlinkTelegramCommand : IRequest;

public class UnlinkTelegramCommandHandler(IApplicationDbContext db, IUser currentUser)
    : IRequestHandler<UnlinkTelegramCommand>
{
    public async Task Handle(UnlinkTelegramCommand request, CancellationToken cancellationToken)
    {
        var settings = await db.NotificationSettings.FirstOrDefaultAsync(
            s => s.UserId == currentUser.Id,
            cancellationToken
        );

        if (settings is null)
            return;

        settings.TelegramChatId = null;
        settings.TelegramUsername = null;

        await db.SaveChangesAsync(cancellationToken);
    }
}
