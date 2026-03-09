using Hangfire;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class HangfireRecurringJobsBootstrapper(
    IRecurringJobManager recurringJobManager,
    IOptions<RecurringJobsOptions> recurringJobsOptions) : IHostedService
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
        if (recurringJobsOptions.Value.AutoListJobEnabled)
        {
            recurringJobManager.AddOrUpdate<AutoListPublicationJob>(
                AutoListPublicationJob.JobName,
                job => job.CheckNewScheduledPosts(CancellationToken.None),
                Cron.Minutely());
        }
        else
        {
            recurringJobManager.RemoveIfExists(AutoListPublicationJob.JobName);
        }
    }

    private void AddTokenRefreshCheckJob()
    {
        if (recurringJobsOptions.Value.TokenRefreshJobEnabled)
        {
            recurringJobManager.AddOrUpdate<TokenRefreshCheckJob>(
                TokenRefreshCheckJob.JobName,
                job => job.CheckExpiringTokensAsync(CancellationToken.None),
                Cron.Daily());
        }
        else
        {
            recurringJobManager.RemoveIfExists(TokenRefreshCheckJob.JobName);
        }
    }
}
