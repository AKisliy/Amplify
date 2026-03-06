namespace Publisher.Infrastructure.Models.TikTok;

using Newtonsoft.Json;

public sealed class TikTokVideoInitRequest
{
    [JsonProperty("post_info", Required = Required.Always)]
    public required TikTokPostInfo PostInfo { get; init; }

    [JsonProperty("source_info", Required = Required.Always)]
    public required TikTokSourceInfo SourceInfo { get; init; }
}

public sealed record TikTokPostInfo
{
    [JsonProperty("privacy_level", Required = Required.Always)]
    public required TikTokPrivacyLevel PrivacyLevel { get; init; }

    [JsonProperty("title", NullValueHandling = NullValueHandling.Ignore)]
    public string? Title { get; init; }

    [JsonProperty("disable_duet", NullValueHandling = NullValueHandling.Ignore)]
    public bool? DisableDuet { get; init; }

    [JsonProperty("disable_stitch", NullValueHandling = NullValueHandling.Ignore)]
    public bool? DisableStitch { get; init; }

    [JsonProperty("disable_comment", NullValueHandling = NullValueHandling.Ignore)]
    public bool? DisableComment { get; init; }

    [JsonProperty("video_cover_timestamp_ms", NullValueHandling = NullValueHandling.Ignore)]
    public int? VideoCoverTimestampMs { get; init; }

    [JsonProperty("brand_content_toggle", NullValueHandling = NullValueHandling.Ignore)]
    public bool? BrandContentToggle { get; init; }

    [JsonProperty("brand_organic_toggle", NullValueHandling = NullValueHandling.Ignore)]
    public bool? BrandOrganicToggle { get; init; }

    [JsonProperty("is_aigc", NullValueHandling = NullValueHandling.Ignore)]
    public bool? IsAigc { get; init; }
}

public sealed class TikTokSourceInfo
{
    [JsonProperty("source", Required = Required.Always)]
    public required TikTokSourceType Source { get; init; }

    // PULL_FROM_URL
    [JsonProperty("video_url", NullValueHandling = NullValueHandling.Ignore)]
    public string? VideoUrl { get; init; }

    // FILE_UPLOAD
    [JsonProperty("video_size", NullValueHandling = NullValueHandling.Ignore)]
    public long? VideoSize { get; init; }

    [JsonProperty("chunk_size", NullValueHandling = NullValueHandling.Ignore)]
    public long? ChunkSize { get; init; }

    [JsonProperty("total_chunk_count", NullValueHandling = NullValueHandling.Ignore)]
    public long? TotalChunkCount { get; init; }
}