using System.Text.Json.Serialization;

namespace Publisher.Infrastructure.Models.Instagram;

// POST https://api.instagram.com/oauth/access_token response
public class InstagramShortLivedTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public long UserId { get; set; } = 0;

    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = [];
}
