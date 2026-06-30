using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Application.NotificationSettings.Commands.GenerateLinkToken;

public record GenerateLinkTokenCommand : IRequest<GenerateLinkTokenResult>;

public record GenerateLinkTokenResult(string Token, string BotUsername);

public class GenerateLinkTokenCommandHandler(
    ITelegramLinkTokenCache tokenCache,
    TelegramBotConfig botConfig,
    IUser currentUser
) : IRequestHandler<GenerateLinkTokenCommand, GenerateLinkTokenResult>
{
    public Task<GenerateLinkTokenResult> Handle(
        GenerateLinkTokenCommand request,
        CancellationToken cancellationToken
    )
    {
        if (currentUser.Id is null)
            throw new InvalidOperationException("Current user is not authenticated.");

        var token = tokenCache.GenerateToken(currentUser.Id!.Value);

        var botName = botConfig.BotUsername;
        botName = botName.Replace("@", string.Empty, StringComparison.OrdinalIgnoreCase);

        return Task.FromResult(new GenerateLinkTokenResult(token, botName));
    }
}

/// <summary>Simple value object injected from TelegramOptions — avoids IOptions dependency in Application layer.</summary>
public record TelegramBotConfig(string BotUsername);
