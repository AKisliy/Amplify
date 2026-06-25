namespace WebSocketGateway.Application.Common.Interfaces;

public interface ITelegramLinkTokenCache
{
    string GenerateToken(Guid userId);
    bool TryConsume(string token, out Guid userId);
}
