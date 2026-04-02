namespace Contracts.Events;

public record FinalAssetGenerated(
    Guid Id,
    Guid JobId,
    Guid UserId,
    Guid ProjectId,
    Guid TemplateId,
    Guid MediaId,
    string MediaType);
