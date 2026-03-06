namespace Publisher.Infrastructure.Models.TikTok;

using Newtonsoft.Json;

public sealed class TikTokVideoInitResponse
{
    [JsonProperty("data")]
    public TikTokVideoInitData? Data { get; init; }

    [JsonProperty("error", Required = Required.Always)]
    public required TikTokError Error { get; init; }
}

public sealed class TikTokVideoInitData
{
    [JsonProperty("publish_id")]
    public required string PublishId { get; init; }

    [JsonProperty("upload_url")]
    public string? UploadUrl { get; init; }
}
