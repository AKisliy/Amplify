namespace UserService.Domain.Entities;

/// <summary>
/// Read-only projection of template_service.node_executions joined with project context.
/// Backed by the <c>userservice.node_execution_log</c> view.
/// </summary>
public class NodeExecutionLog
{
    public Guid ExecutionId { get; set; }
    public Guid JobId { get; set; }
    public string ClassName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public Guid ProjectId { get; set; }
    public DateTime OccurredAt { get; set; }
}
