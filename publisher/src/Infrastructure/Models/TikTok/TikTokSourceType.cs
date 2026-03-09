using System.Text.Json.Serialization;
using Newtonsoft.Json.Converters;

namespace Publisher.Infrastructure.Models.TikTok;

[JsonConverter(typeof(StringEnumConverter))]
public enum TikTokSourceType
{
    PULL_FROM_URL,
    FILE_UPLOAD
}