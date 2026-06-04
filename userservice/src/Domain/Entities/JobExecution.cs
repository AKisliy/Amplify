namespace UserService.Domain.Entities;

/// <summary>
/// Read-only projection of template_service.jobs joined with template/project hierarchy.
/// Backed by the <c>userservice.job_executions</c> view.
/// </summary>
public class JobExecution
{
    public Guid JobId { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int? DurationSec { get; set; }
    public Guid ProjectId { get; set; }
    public Guid TemplateId { get; set; }
}
