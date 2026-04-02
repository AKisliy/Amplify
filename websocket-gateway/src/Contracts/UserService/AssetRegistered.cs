namespace WebSocketGateway.Contracts.UserService;

public class AssetRegistered
{
    public required string Id { get; set; }

    public required string JobId { get; set; }

    public required string UserId { get; set; }

    public required string ProjectId { get; set; }

    public required string MediaId { get; set; }

    public required string MediaType { get; set; }
}
