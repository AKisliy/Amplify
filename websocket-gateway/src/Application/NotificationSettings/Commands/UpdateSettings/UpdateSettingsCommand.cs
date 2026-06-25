using Microsoft.EntityFrameworkCore;
using WebSocketGateway.Application.Common.Interfaces;
using NotificationSettingsEntity = WebSocketGateway.Domain.Entities.NotificationSettings;

namespace WebSocketGateway.Application.NotificationSettings.Commands.UpdateSettings;

public record UpdateSettingsCommand(
    bool NotifyOnlyWhenOffline,
    bool NotifyOnError,
    bool NotifyOnHitl,
    bool NotifyOnCompletion,
    bool NotifyOnPublication
) : IRequest;

public class UpdateSettingsCommandHandler(IApplicationDbContext db, IUser currentUser)
    : IRequestHandler<UpdateSettingsCommand>
{
    public async Task Handle(UpdateSettingsCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;

        if (userId is null)
            throw new InvalidOperationException("Current user is not authenticated.");

        var settings = await db.NotificationSettings.FirstOrDefaultAsync(
            s => s.UserId == userId,
            cancellationToken
        );

        if (settings is null)
        {
            settings = new NotificationSettingsEntity { UserId = userId.Value };
            db.NotificationSettings.Add(settings);
        }

        settings.NotifyOnlyWhenOffline = request.NotifyOnlyWhenOffline;
        settings.NotifyOnError = request.NotifyOnError;
        settings.NotifyOnHitl = request.NotifyOnHitl;
        settings.NotifyOnCompletion = request.NotifyOnCompletion;
        settings.NotifyOnPublication = request.NotifyOnPublication;

        await db.SaveChangesAsync(cancellationToken);
    }
}
