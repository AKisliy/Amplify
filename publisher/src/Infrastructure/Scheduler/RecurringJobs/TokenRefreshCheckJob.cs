using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class TokenRefreshCheckJob(
    IApplicationDbContext dbContext,
    IBackgroundJobClient backgroundJobClient,
    TimeProvider timeProvider,
    ILogger<TokenRefreshCheckJob> logger)
{
    private static readonly TimeSpan RefreshThreshold = TimeSpan.FromHours(24);

    public const string JobName = "TokenRefreshCheckJob";

    public async Task CheckExpiringTokensAsync(CancellationToken cancellationToken)
    {
        var currentTime = timeProvider.GetUtcNow();
        var threshold = currentTime.UtcDateTime.Add(RefreshThreshold);

        var expiringAccounts = await dbContext.SocialAccounts
            .Where(a => a.TokenExpiresAt >= currentTime.UtcDateTime && a.TokenExpiresAt <= threshold)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        logger.LogInformation("Found {Count} accounts with tokens expiring within {Threshold}",
            expiringAccounts.Count, RefreshThreshold);

        foreach (var accountId in expiringAccounts)
        {
            backgroundJobClient.Enqueue<TokenRefreshJob>(job => job.RefreshAsync(accountId, CancellationToken.None));
        }
    }
}
