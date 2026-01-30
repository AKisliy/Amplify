using Hangfire;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.EventHandlers;

public class PublicationRecordCreatedEventHandler(
    ILogger<PublicationRecordCreatedEventHandler> logger,
    IBackgroundJobClient backgroundJobClient)
    : INotificationHandler<PublicationRecordCreated>
{
    public Task Handle(PublicationRecordCreated notification, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Scheduling publication job for PublicationRecord {PublicationRecordId}",
            notification.PublicationRecord.Id);

        backgroundJobClient.Enqueue<IPublicationService>(
            service => service.PublishPostAsync(notification.PublicationRecord.Id, cancellationToken));

        return Task.CompletedTask;
    }
}
