
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<MediaFile> MediaFiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
