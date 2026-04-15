using System.Text.Json.Serialization;

namespace Contracts;

public class MediaProcessingCompleted
{
    [JsonPropertyName("mediaId")]
    public Guid MediaId { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
