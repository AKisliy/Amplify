using Microsoft.Extensions.Logging;
using UserService.Application.Common.Interfaces.Clients;
using UserService.Domain.Events.AmbassadorImages;

namespace UserService.Application.AmbassadorImages.EventHandlers;

public class AmbassadorImageDeletedEventHandler(
    ILogger<AmbassadorImageDeletedEventHandler> logger,
    IMediaServiceClient mediaServiceClient)
    : INotificationHandler<AmbassadorImageDeletedEvent>
{
    public async Task Handle(AmbassadorImageDeletedEvent notification, CancellationToken cancellationToken)
    {
        // Implement any logic that should occur when an ambassador image is deleted.
        // For example, logging, cleanup, notifying other services, etc.
        logger.LogInformation("Ambassador image with ID {ImageId} has been deleted.", notification.Entity.Id);

        await mediaServiceClient.DeleteMediaAsync(notification.Entity.MediaId);
    }
}