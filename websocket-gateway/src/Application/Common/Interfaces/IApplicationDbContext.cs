using Microsoft.EntityFrameworkCore;
using NotificationSettingsEntity = WebSocketGateway.Domain.Entities.NotificationSettings;

namespace WebSocketGateway.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<NotificationSettingsEntity> NotificationSettings { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
