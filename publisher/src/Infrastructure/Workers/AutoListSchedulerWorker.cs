using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Publisher.Contracts.Events;

namespace Publisher.Infrastructure.Workers;

public class AutoListSchedulerWorker(
    IServiceProvider serviceProvider,
    ILogger<AutoListSchedulerWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("AutoListScheduler worker started.");

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = serviceProvider.CreateAsyncScope();

                var retriever = scope.ServiceProvider.GetRequiredService<AutoListEntryRetriever>();
                var bus = scope.ServiceProvider.GetRequiredService<IBus>();
                var timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();

                var now = timeProvider.GetLocalNow();

                var autoListEntries = await retriever.GetEntriesForTriggerAsync(now, stoppingToken);

                logger.LogDebug("Found {Count} entries to process", autoListEntries.Count);

                foreach (var entry in autoListEntries)
                {
                    await bus.Publish(new PublishRequested(entry.Id, now), stoppingToken);

                    logger.LogInformation("Scheduled event sent for Entry #{Id}", entry.Id);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while scheduling auto-list entries");
            }
        }
    }
}

