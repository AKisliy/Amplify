using Publisher.Domain.Entities;

namespace Publisher.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<AutoListEntry> AutoListEntries { get; }

    DbSet<MediaPost> MediaPosts { get; }

    DbSet<SocialAccount> SocialAccounts { get; }

    DbSet<AutoList> AutoLists { get; }

    DbSet<InstagramPublishingPreset> InstagramPublishingPresets { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
