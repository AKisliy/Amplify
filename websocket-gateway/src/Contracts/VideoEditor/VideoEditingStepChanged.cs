namespace WebSocketGateway.Contracts.VideoEditor;

public class VideoEditingStepChanged
{
    public required string VideoId { get; set; }

    public required string NodeId { get; set; }

    public required string UserId { get; set; }

    public required string Step { get; set; }

    public required string Status { get; set; }

    public string? Error { get; set; }
}
