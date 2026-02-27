using Hangfire;
using Microsoft.Extensions.Hosting;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class HangfireRecurringJobsBootstrapper(IRecurringJobManager recurringJobManager) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        AddAutoListPublicationJob();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private void AddAutoListPublicationJob()
    {
        var interval = Cron.Minutely();

        recurringJobManager.AddOrUpdate<AutoListPublicationJob>(
            AutoListPublicationJob.JobName,
            job => job.CheckNewScheduledPosts(CancellationToken.None),
            interval);
    }
}
