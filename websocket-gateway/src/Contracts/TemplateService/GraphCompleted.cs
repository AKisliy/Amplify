namespace WebSocketGateway.Contracts.TemplateService;

public class GraphCompleted
{
    public required string JobId { get; set; }

    public required string UserId { get; set; }

    public required string TemplateId { get; set; }

    public string? MediaId { get; set; }

    public string? MediaType { get; set; }
}
