using Publisher.Core.Entities;

namespace Publisher.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<SocialMediaAccount> SocialMediaAccounts { get; }

    DbSet<PublishedVideo> PublishedVideos { get; }

    DbSet<PostContainer> PostContainers { get; }

    DbSet<AutoList> AutoLists { get; }

    DbSet<AutoListEntry> AutoListEntries { get; }

    DbSet<InstagramPublishingPreset> InstagramPublishingPresets { get; }

    DbSet<CreatedPost> CreatedPosts { get; }

    DbSet<Actor> Actors { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
