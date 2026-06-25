using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Telegram.Bot;

namespace WebSocketGateway.Infrastructure.Telegram;

internal sealed class TelegramWebhookSetupService(
    ITelegramBotClient botClient,
    IOptions<TelegramOptions> options,
    ILogger<TelegramWebhookSetupService> logger
) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var webhookUrl = options.Value.WebhookUrl;

        if (string.IsNullOrEmpty(webhookUrl))
        {
            logger.LogInformation(
                "Telegram WebhookUrl is not configured, skipping webhook registration"
            );
            return;
        }

        await botClient.SetWebhook(webhookUrl, cancellationToken: cancellationToken);
        logger.LogInformation("Telegram webhook registered at {WebhookUrl}", webhookUrl);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
