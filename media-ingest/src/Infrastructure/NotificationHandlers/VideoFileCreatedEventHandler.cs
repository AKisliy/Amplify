using MediatR;
using MediaIngest.Application.Media.Notifications;
using MediaIngest.Domain.Events;

namespace MediaIngest.Infrastructure.NotificationHandlers;

internal class VideoFileCreatedEventHandler(IPublisher publisher) : INotificationHandler<VideoFileCreatedEvent>
{
    public Task Handle(VideoFileCreatedEvent notification, CancellationToken cancellationToken)
        => publisher.Publish(new VideoNormalizeRequested(notification.MediaFile.Id, notification.FileKey), cancellationToken);
}
