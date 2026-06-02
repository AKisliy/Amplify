namespace UserService.Domain.Entities;

/// <summary>
/// Read-only projection of LiteLLM spend logs for billing analytics.
/// Backed by the <c>userservice.generation_spend</c> view which queries
/// <c>public."LiteLLM_SpendLogs"</c> in the same Postgres database.
/// </summary>
public class GenerationSpendLog
{
    public string RequestId { get; set; } = null!;
    public DateTime OccurredAt { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? TemplateId { get; set; }
    public Guid? JobId { get; set; }
    public string Model { get; set; } = null!;
    public double? CostUsd { get; set; }
    public int TotalTokens { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int? DurationMs { get; set; }
    public string? Status { get; set; }
}
