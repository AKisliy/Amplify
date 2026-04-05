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
        recurringJobManager.RemoveIfExists("AutoListPublicationJob");
        AddTokenRefreshCheckJob();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
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
