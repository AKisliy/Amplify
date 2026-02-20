using System.Reflection;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediaIngest.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public const string DefaultSchemaName = "media_ingest";

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema(DefaultSchemaName);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
