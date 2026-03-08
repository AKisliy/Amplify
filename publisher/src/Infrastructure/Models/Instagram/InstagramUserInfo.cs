using System.Text.Json.Serialization;

namespace Publisher.Infrastructure.Models.Instagram;

public class InstagramUserInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("profile_picture_url")]
    public string? ProfilePictureUrl { get; set; }
}
