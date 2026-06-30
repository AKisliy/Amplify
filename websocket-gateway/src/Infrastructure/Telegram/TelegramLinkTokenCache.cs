using Microsoft.Extensions.Caching.Memory;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Infrastructure.Telegram;

public class TelegramLinkTokenCache(IMemoryCache cache) : ITelegramLinkTokenCache
{
    private static readonly TimeSpan TokenTtl = TimeSpan.FromMinutes(10);
    private const string KeyPrefix = "tg_link_";

    public string GenerateToken(Guid userId)
    {
        var token = Guid.NewGuid().ToString("N");
        cache.Set(KeyPrefix + token, userId, TokenTtl);
        return token;
    }

    public bool TryConsume(string token, out Guid userId)
    {
        var key = KeyPrefix + token;
        if (!cache.TryGetValue(key, out Guid stored))
        {
            userId = Guid.Empty;
            return false;
        }
        cache.Remove(key);
        userId = stored;
        return true;
    }
}
