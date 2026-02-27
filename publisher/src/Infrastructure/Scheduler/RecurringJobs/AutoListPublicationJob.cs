using MassTransit;
using Microsoft.Extensions.Logging;
using Publisher.Contracts.Events;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class AutoListPublicationJob(
    ILogger<AutoListPublicationJob> logger,
    AutoListEntryRetriever retriever,
    IBus bus,
    TimeProvider timeProvider)
{
    public const string JobName = "AutoListPublicationJob";

    public async Task CheckNewScheduledPosts(CancellationToken cancellationToken)
    {
        var now = timeProvider.GetLocalNow();

        var autoListEntries = await retriever.GetEntriesForTriggerAsync(now, cancellationToken);

        logger.LogInformation("Found {Count} entries to process", autoListEntries.Count);

        await bus.PublishBatch(autoListEntries.Select(entry => new PublishFromAutoListRequested(entry.Id, now)), cancellationToken);

        logger.LogInformation("Scheduled event sent for {Count} entries", autoListEntries.Count);
    }
}
