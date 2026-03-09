namespace Publisher.Infrastructure.Models.TikTok;

using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

[JsonConverter(typeof(StringEnumConverter))]
public enum TikTokPrivacyLevel
{
    PUBLIC_TO_EVERYONE,
    MUTUAL_FOLLOW_FRIENDS,
    FOLLOWER_OF_CREATOR,
    SELF_ONLY
}