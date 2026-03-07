using Hangfire;
using Microsoft.Extensions.Hosting;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class HangfireRecurringJobsBootstrapper(IRecurringJobManager recurringJobManager) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        AddAutoListPublicationJob();
        AddTokenRefreshCheckJob();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private void AddAutoListPublicationJob()
    {
        recurringJobManager.AddOrUpdate<AutoListPublicationJob>(
            AutoListPublicationJob.JobName,
            job => job.CheckNewScheduledPosts(CancellationToken.None),
            Cron.Minutely());
    }

    private void AddTokenRefreshCheckJob()
    {
        recurringJobManager.AddOrUpdate<TokenRefreshCheckJob>(
            TokenRefreshCheckJob.JobName,
            job => job.CheckExpiringTokensAsync(CancellationToken.None),
            Cron.Daily());
    }
}
