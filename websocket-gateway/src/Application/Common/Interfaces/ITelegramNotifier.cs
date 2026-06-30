namespace WebSocketGateway.Application.Common.Interfaces;

public interface ITelegramNotifier
{
    Task SendMessageAsync(long chatId, string text, CancellationToken cancellationToken = default);
}
