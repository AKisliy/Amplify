using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;

namespace Publisher.Infrastructure.Scheduler.RecurringJobs;

public class TokenRefreshJob(
    IApplicationDbContext dbContext,
    IConnectionServiceFactory connectionServiceFactory,
    ILogger<TokenRefreshJob> logger)
{
    public async Task RefreshAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = await dbContext.SocialAccounts
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);

        if (account is null)
        {
            logger.LogWarning("Token refresh skipped: account {AccountId} not found", accountId);
            return;
        }

        logger.LogInformation("Refreshing token for account {AccountId} ({Provider})", accountId, account.Provider);

        var connectionService = connectionServiceFactory.GetConnectionService(account.Provider);
        await connectionService.RefreshAccessTokenAsync(account, cancellationToken);
    }
}
