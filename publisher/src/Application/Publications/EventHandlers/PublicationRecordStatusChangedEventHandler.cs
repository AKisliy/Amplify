using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Events.Publications;

namespace Publisher.Application.Publications.EventHandlers;

public class PublicationRecordStatusChangedEventHandler(
    IApplicationDbContext context,
    ILogger<PublicationRecordStatusChangedEventHandler> logger,
    IPublicationStatusNotifier publicationStatusNotifier)
    : INotificationHandler<PublicationRecordStatusChangedEvent>
{
    public async Task Handle(PublicationRecordStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        var mediaPost = context.MediaPosts
            .FirstOrDefault(mp => mp.Id == notification.PublicationRecord.MediaPostId);

        if (mediaPost is null)
        {
            logger.LogWarning("MediaPost with ID {MediaPostId} not found for PublicationRecord ID {PublicationRecordId}",
                notification.PublicationRecord.MediaPostId, notification.PublicationRecord.Id);
            return;
        }

        logger.LogInformation("Notifying status change for PublicationRecord ID {PublicationRecordId} to {Status}",
            notification.PublicationRecord.Id, notification.PublicationRecord.Status);

        await publicationStatusNotifier.NotifyPublicationStatusChangedAsync(notification.PublicationRecord);
    }
}
