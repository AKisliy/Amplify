using System.Reflection;
using UserService.Application.Common.Interfaces;
using UserService.Domain.Entities;
using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using UserService.Infrastructure.Extensions;

namespace UserService.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IApplicationDbContext, IDataProtectionKeyContext
{
    public const string DefaultSchemaName = "userservice";

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectAsset> ProjectAssets => Set<ProjectAsset>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema(DefaultSchemaName);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        builder.ChangeIdentityTablesNaming();
    }
}
