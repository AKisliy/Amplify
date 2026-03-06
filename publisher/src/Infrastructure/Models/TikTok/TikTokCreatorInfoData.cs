using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.TikTok;

public sealed class TikTokCreatorInfoData
{
    [JsonProperty("creator_avatar_url")]
    public required string CreatorAvatarUrl { get; init; }

    [JsonProperty("creator_username")]
    public required string CreatorUsername { get; init; }

    [JsonProperty("creator_nickname")]
    public required string CreatorNickname { get; init; }

    [JsonProperty("privacy_level_options")]
    public required IReadOnlyList<TikTokPrivacyLevel> PrivacyLevelOptions { get; init; }

    [JsonProperty("comment_disabled")]
    public bool CommentDisabled { get; init; }

    [JsonProperty("duet_disabled")]
    public bool DuetDisabled { get; init; }

    [JsonProperty("stitch_disabled")]
    public bool StitchDisabled { get; init; }

    [JsonProperty("max_video_post_duration_sec")]
    public int MaxVideoPostDurationSec { get; init; }
}
