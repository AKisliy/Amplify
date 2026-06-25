using WebSocketGateway.Domain.Common;

namespace WebSocketGateway.Domain.Entities;

public class NotificationSettings : BaseEntity
{
    /// <summary>External user id from JWT (sub claim). Not a FK — ws-gateway has no user table.</summary>
    public required Guid UserId { get; set; }

    /// <summary>Telegram chat id obtained after /start linking flow. Null = not linked.</summary>
    public long? TelegramChatId { get; set; }

    /// <summary>Telegram username for display in UI (e.g. "@alice"). Null = not linked.</summary>
    public string? TelegramUsername { get; set; }

    /// <summary>When true, Telegram notifications are only sent if the user has no active SignalR connection.</summary>
    public bool NotifyOnlyWhenOffline { get; set; } = false;

    public bool NotifyOnError { get; set; } = true;

    public bool NotifyOnHitl { get; set; } = true;

    public bool NotifyOnCompletion { get; set; } = true;

    public bool NotifyOnPublication { get; set; } = false;
}
