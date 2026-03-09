using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.TikTok;

public class TikTokError
{
    [JsonProperty("code")]
    public string? Code { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("log_id")]
    public string? LogId { get; set; }
}