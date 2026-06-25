using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Domain.Entities;

namespace WebSocketGateway.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public const string DefaultSchemaName = "wsgateway";

    public DbSet<NotificationSettings> NotificationSettings => Set<NotificationSettings>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema(DefaultSchemaName);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
