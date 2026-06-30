using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Application.NotificationSettings.Queries.GetSettings;

public record GetSettingsQuery : IRequest<NotificationSettingsDto>;

public record NotificationSettingsDto(
    long? TelegramChatId,
    string? TelegramUsername,
    bool NotifyOnlyWhenOffline,
    bool NotifyOnError,
    bool NotifyOnHitl,
    bool NotifyOnCompletion,
    bool NotifyOnPublication
);

public class GetSettingsQueryHandler(IApplicationDbContext db, IUser currentUser)
    : IRequestHandler<GetSettingsQuery, NotificationSettingsDto>
{
    public async Task<NotificationSettingsDto> Handle(
        GetSettingsQuery request,
        CancellationToken cancellationToken
    )
    {
        var userId = currentUser.Id!;

        var settings = await db.NotificationSettings.FirstOrDefaultAsync(
            s => s.UserId == userId,
            cancellationToken
        );

        if (settings is null)
            return new NotificationSettingsDto(null, null, false, true, true, true, false);

        return new NotificationSettingsDto(
            settings.TelegramChatId,
            settings.TelegramUsername,
            settings.NotifyOnlyWhenOffline,
            settings.NotifyOnError,
            settings.NotifyOnHitl,
            settings.NotifyOnCompletion,
            settings.NotifyOnPublication
        );
    }
}
