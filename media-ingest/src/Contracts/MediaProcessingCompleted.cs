using System.Text.Json.Serialization;

namespace Contracts;

public class MediaProcessingCompleted
{
    [JsonPropertyName("mediaId")]
    public Guid MediaId { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("thumbTinyKey")]
    public string? ThumbTinyKey { get; set; }

    [JsonPropertyName("thumbMediumKey")]
    public string? ThumbMediumKey { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
