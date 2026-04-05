using Hangfire;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Enums;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.EventHandlers;

public class PublicationRecordCreatedEventHandler(
    ILogger<PublicationRecordCreatedEventHandler> logger,
    IBackgroundJobClient backgroundJobClient)
    : INotificationHandler<PublicationRecordCreated>
{
    public Task Handle(PublicationRecordCreated notification, CancellationToken cancellationToken)
    {
        var record = notification.PublicationRecord;

        if (record.PublicationType == PublicationType.AutoList && record.ScheduledAt.HasValue)
        {
            logger.LogInformation(
                "Scheduling AutoList publication for PublicationRecord {Id} at {ScheduledAt}",
                record.Id, record.ScheduledAt);

            backgroundJobClient.Schedule<IPublicationService>(
                service => service.PublishPostAsync(record.Id, CancellationToken.None),
                record.ScheduledAt.Value);
        }
        else
        {
            logger.LogInformation(
                "Enqueueing immediate publication for PublicationRecord {Id}", record.Id);

            backgroundJobClient.Enqueue<IPublicationService>(
                service => service.PublishPostAsync(record.Id, CancellationToken.None));
        }

        return Task.CompletedTask;
    }
}
