using MediatR;
using Telegram.Bot.Types;
using WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;

namespace WebSocketGateway.Web.Endpoints;

public static class TelegramWebhookEndpoint
{
    public static IEndpointRouteBuilder MapTelegramWebhookEndpoint(this IEndpointRouteBuilder app)
    {
        // No RequireAuthorization — Telegram calls this, not our users
        // ExcludeFromDescription: Telegram.Bot.Types.Update has complex discriminator
        // hierarchies that NSwag cannot handle during schema generation.
        app.MapPost(
            "/api/telegram/webhook",
            async (Update update, IMediator mediator, ILogger<Update> logger) =>
            {
                if (update.Message?.Text is not { } text)
                    return Results.Ok();

                if (text.StartsWith("/start "))
                {
                    var token = text["/start ".Length..].Trim();
                    var chatId = update.Message.Chat.Id;
                    var username = update.Message.From?.Username;

                    var linked = await mediator.Send(
                        new ConfirmTelegramLinkCommand(token, chatId, username)
                    );

                    logger.LogInformation(
                        "Telegram link attempt: token={Token} chatId={ChatId} success={Success}",
                        token,
                        chatId,
                        linked
                    );
                }

                return Results.Ok();
            }
        ).ExcludeFromDescription();

        return app;
    }
}
