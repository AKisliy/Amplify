using Hangfire;
using Microsoft.Extensions.Hosting;

namespace MediaIngest.Infrastructure.Scheduler.BackgroundJobs;

internal class BackgroundJobsBootstrapper(IRecurringJobManager recurringJobManager) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        recurringJobManager.AddOrUpdate<UploadReconciliationJob>(
            "upload-reconciliation",
            job => job.ExecuteAsync(),
            "*/5 * * * *");

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
