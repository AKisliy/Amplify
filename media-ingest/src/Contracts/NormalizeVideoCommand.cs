using System.Text.Json.Serialization;

namespace Contracts;

public class NormalizeVideoCommand
{
    [JsonPropertyName("mediaId")]
    public Guid MediaId { get; set; }

    [JsonPropertyName("fileKey")]
    public string FileKey { get; set; } = string.Empty;
}
