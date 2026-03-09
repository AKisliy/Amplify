using Contracts;
using MassTransit;
using MediaIngest.Application.Media.Notifications;
using MediatR;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.NotificationHandlers;

internal class VideoNormalizeRequestedHandler(
    ILogger<VideoNormalizeRequestedHandler> logger,
    IBus bus) : INotificationHandler<VideoNormalizeRequested>
{
    public async Task Handle(VideoNormalizeRequested notification, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Received VideoNormalizeRequested notification for MediaId: {MediaId}.",
            notification.MediaId);

        var command = new NormalizeVideoCommand
        {
            MediaId = notification.MediaId,
            FileKey = notification.FileKey
        };

        await bus.Publish(command, cancellationToken);

        logger.LogInformation("Sent command {CommandName} to broker", nameof(NormalizeVideoCommand));
    }
}
