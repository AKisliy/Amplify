using UserService.Domain.Entities;

namespace UserService.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<Ambassador> Ambassadors { get; }
    DbSet<AmbassadorImage> AmbassadorImages { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
