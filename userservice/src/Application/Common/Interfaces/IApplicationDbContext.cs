using UserService.Domain.Entities;

namespace UserService.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<ProjectAsset> ProjectAssets { get; }
    DbSet<GenerationSpendLog> GenerationSpendLogs { get; }
    DbSet<JobExecution> JobExecutions { get; }
    DbSet<NodeExecutionLog> NodeExecutionLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
