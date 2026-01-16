using UserService.Domain.Entities;

namespace UserService.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<Ambassador> Ambassadors { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
