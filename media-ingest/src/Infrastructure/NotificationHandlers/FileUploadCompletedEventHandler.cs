using Contracts;
using MassTransit;
using MediaIngest.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.NotificationHandlers;

internal class FileUploadCompletedEventHandler(
    IBus bus,
    ILogger<FileUploadCompletedEventHandler> logger) : INotificationHandler<FileUploadCompleted>
{
    public async Task Handle(FileUploadCompleted notification, CancellationToken cancellationToken)
    {
        var command = new ProcessMediaCommand
        {
            MediaId = notification.MediaId,
            FileKey = notification.FileKey,
            ContentType = notification.ContentType,
        };

        await bus.Publish(command, cancellationToken);

        logger.LogInformation(
            "Published {Command} for MediaId={MediaId}, ContentType={ContentType}",
            nameof(ProcessMediaCommand), notification.MediaId, notification.ContentType);
    }
}
