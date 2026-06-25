namespace WebSocketGateway.Infrastructure.Telegram;

public class TelegramOptions
{
    public const string ConfigurationSection = "Telegram";

    public required string BotToken { get; set; }
    public required string BotUsername { get; set; }
    /// <summary>Public HTTPS URL for Telegram webhook. Empty = polling mode (local dev only).</summary>
    public string WebhookUrl { get; set; } = string.Empty;
}
