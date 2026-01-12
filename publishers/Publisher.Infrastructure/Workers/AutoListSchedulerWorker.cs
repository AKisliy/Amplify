using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Contracts.Events;

namespace Publisher.Infrastructure.Workers;

public class AutoListSchedulerWorker(
    IServiceProvider serviceProvider,
    TimeProvider timeProvider,
    ILogger<AutoListSchedulerWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogDebug("AutoListScheduler worker started....");

        await using var scope = serviceProvider.CreateAsyncScope();
        var bus = scope.ServiceProvider.GetRequiredService<IBus>();
        var retriever = scope.ServiceProvider.GetRequiredService<IAutoListEntryRetriever>();
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = timeProvider.GetLocalNow();

            var autoListEntries = await retriever.GetEntriesForTriggerAsync(now, stoppingToken);
            foreach (var entry in autoListEntries)
            {
                var evt = new PublishRequested
                (
                    entry.Id,
                    now
                );

                logger.LogDebug("Send publishing event for AutoListEntry #{AutoListEntryId}", entry.Id);

                await bus.Publish(evt, stoppingToken);
            }

            // ждём до следующей минуты
            now = timeProvider.GetUtcNow();
            var delay = 60000 - (now.Second * 1000 + now.Millisecond);
            await Task.Delay(delay, stoppingToken);
        }
    }
}

