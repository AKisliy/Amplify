using Microsoft.EntityFrameworkCore;
using Publisher.Application.Common.Interfaces;
using Publisher.Core.Entities;
using Publisher.Core.Enums;

namespace Publisher.Infrastructure.Data;

public class PublisherDbContext : DbContext, IApplicationDbContext
{
    public PublisherDbContext(DbContextOptions<PublisherDbContext> options)
        : base(options)
    {
    }

    public DbSet<SocialMediaAccount> SocialMediaAccounts => Set<SocialMediaAccount>();

    public DbSet<PublishedVideo> PublishedVideos => Set<PublishedVideo>();

    public DbSet<PostContainer> PostContainers => Set<PostContainer>();

    public DbSet<AutoList> AutoLists => Set<AutoList>();

    public DbSet<AutoListEntry> AutoListEntries => Set<AutoListEntry>();

    public DbSet<Cover> Covers => Set<Cover>();

    public DbSet<InstagramPublishingPreset> InstagramPublishingPresets => Set<InstagramPublishingPreset>();

    public DbSet<Actor> Actors => Set<Actor>();

    public DbSet<CreatedPost> CreatedPosts => Set<CreatedPost>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum<SocialMedia>();
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PublisherDbContext).Assembly);
    }
}
