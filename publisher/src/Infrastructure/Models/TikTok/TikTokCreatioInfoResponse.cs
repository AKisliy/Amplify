using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.TikTok;

public sealed class TikTokCreatorInfoResponse
{
    [JsonProperty("data")]
    public TikTokCreatorInfoData? Data { get; init; }

    [JsonProperty("error", Required = Required.Always)]
    public required TikTokError Error { get; init; }
}
