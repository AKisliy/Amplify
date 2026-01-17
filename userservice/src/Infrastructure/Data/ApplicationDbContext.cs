using System.Reflection;
using UserService.Application.Common.Interfaces;
using UserService.Domain.Entities;
using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using UserService.Infrastructure.Extensions;

namespace UserService.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IApplicationDbContext
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Ambassador> Ambassadors => Set<Ambassador>();
    public DbSet<AmbassadorImage> AmbassadorImages => Set<AmbassadorImage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        builder.ChangeIdentityTablesNaming();
    }
}
