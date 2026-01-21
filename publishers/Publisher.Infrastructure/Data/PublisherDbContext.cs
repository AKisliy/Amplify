using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Publisher.Application.Common.Interfaces;
using Publisher.Core.Entities;
using Publisher.Core.Enums;
using Publisher.Infrastructure.Data.Converters;

namespace Publisher.Infrastructure.Data;

public class PublisherDbContext : DbContext, IApplicationDbContext, IDataProtectionKeyContext
{
    private readonly IDataProtectionProvider _dataProtectionProvider;

    public PublisherDbContext(
        DbContextOptions<PublisherDbContext> options,
        IDataProtectionProvider dataProtectionProvider)
        : base(options)
    {
        _dataProtectionProvider = dataProtectionProvider;
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

    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    public DbSet<InstagramConnection> InstagramConnections => Set<InstagramConnection>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum<SocialMedia>();
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PublisherDbContext).Assembly);

        var encryptionConverter = new EncryptedConverter(_dataProtectionProvider, "InstagramTokenKey");

        modelBuilder.Entity<InstagramConnection>()
            .Property(s => s.AccessToken)
            .HasConversion(encryptionConverter);
    }
}
