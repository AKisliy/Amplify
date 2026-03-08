using System.Text.Json.Serialization;

namespace Publisher.Infrastructure.Models.MediaStorage;

public class GetLinkResponse
{
    [JsonPropertyName("mediaId")]
    public Guid MediaId { get; set; }

    [JsonPropertyName("link")]
    public string Link { get; set; } = string.Empty;
}
