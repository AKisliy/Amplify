using System.Text.Json;

namespace WebSocketGateway.Contracts.TemplateService;

public class NodeExecutionStatusChanged
{
    public required string JobId { get; set; }

    public required string PromptId { get; set; }

    public required string NodeId { get; set; }

    public required string UserId { get; set; }

    public required string Status { get; set; }

    public JsonElement? Outputs { get; set; }

    public string? Error { get; set; }
}
