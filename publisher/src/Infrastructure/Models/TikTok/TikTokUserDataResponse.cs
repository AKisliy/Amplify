using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.TikTok;

public class TikTokUserDataResponse
{
    [JsonProperty("data")]
    public TikTokUserData? Data { get; set; }

    [JsonProperty("error")]
    public TikTokError? Error { get; set; }
}

public class TikTokUserData
{
    [JsonProperty("user")]
    public TikTokUser? User { get; set; }
}

public class TikTokUser
{
    [JsonProperty("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonProperty("open_id")]
    public string? OpenId { get; set; }

    [JsonProperty("union_id")]
    public string? UnionId { get; set; }

    [JsonProperty("display_name")]
    public string? DisplayName { get; set; }
}

public class TikTokError
{
    [JsonProperty("code")]
    public string? Code { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("log_id")]
    public string? LogId { get; set; }
}

