using System.Text.Json.Serialization;

namespace Contracts;

public class ProcessMediaCommand
{
    [JsonPropertyName("mediaId")]
    public Guid MediaId { get; set; }

    [JsonPropertyName("fileKey")]
    public string FileKey { get; set; } = string.Empty;

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; } = string.Empty;
}
