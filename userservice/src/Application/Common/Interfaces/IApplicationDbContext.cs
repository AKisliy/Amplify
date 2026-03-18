using UserService.Domain.Entities;

namespace UserService.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<Ambassador> Ambassadors { get; }
    DbSet<AmbassadorImage> AmbassadorImages { get; }
    DbSet<ProjectAsset> ProjectAssets { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
