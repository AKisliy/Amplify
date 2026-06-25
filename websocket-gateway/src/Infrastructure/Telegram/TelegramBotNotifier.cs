using Telegram.Bot;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Infrastructure.Telegram;

public class TelegramBotNotifier(ITelegramBotClient botClient, ILogger<TelegramBotNotifier> logger)
    : ITelegramNotifier
{
    public async Task SendMessageAsync(long chatId, string text, CancellationToken cancellationToken)
    {
        try
        {
            await botClient.SendMessage(chatId, text, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send Telegram message to chat {ChatId}", chatId);
        }
    }
}
