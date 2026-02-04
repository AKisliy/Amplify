using System.Reflection;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Publisher.Infrastructure.Data.Converters;
using Microsoft.AspNetCore.DataProtection;

namespace Publisher.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext, IDataProtectionKeyContext
{
    private readonly IDataProtectionProvider _dataProtectionProvider;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IDataProtectionProvider dataProtectionProvider)
        : base(options)
    {
        _dataProtectionProvider = dataProtectionProvider;
    }

    // TODO: отследить связи других сущностей с Project
    public DbSet<Project> Projects => Set<Project>();

    public DbSet<PublicationRecord> PublicationRecords => Set<PublicationRecord>();

    public DbSet<AutoList> AutoLists => Set<AutoList>();

    public DbSet<AutoListEntry> AutoListEntries => Set<AutoListEntry>();

    public DbSet<MediaPost> MediaPosts => Set<MediaPost>();

    public DbSet<SocialAccount> SocialAccounts => Set<SocialAccount>();

    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        var encryptionConverter = new EncryptedConverter(_dataProtectionProvider, "SocialCredsKey");

        builder.Entity<SocialAccount>()
            .Property(sa => sa.Credentials)
            .HasColumnType("text")
            .HasConversion(encryptionConverter);
    }
}
