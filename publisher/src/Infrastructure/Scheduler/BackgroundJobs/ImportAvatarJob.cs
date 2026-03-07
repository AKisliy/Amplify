using System.Net.Http.Json;
using Flurl;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Infrastructure.Scheduler.BackgroundJobs;

public class ImportAvatarJob(
    IApplicationDbContext dbContext,
    HttpClient httpClient,
    ILogger<ImportAvatarJob> logger)
{
    public async Task ImportAsync(Guid accountId, string avatarUrl, CancellationToken cancellationToken = default)
    {
        var account = await dbContext.SocialAccounts
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);

        if (account is null)
        {
            logger.LogWarning("Avatar import skipped: account {AccountId} not found", accountId);
            return;
        }

        var importUrl = new Url()
            .AppendPathSegment("api/internal/media/import-url")
            .SetQueryParam("url", avatarUrl);

        var response = await httpClient.PostAsync(importUrl, null, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ImportFromUrlDto>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Empty response from media-ingest");

        account.AvatarMediaId = result.MediaId;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Imported avatar for account {AccountId}, mediaId: {MediaId}", accountId, result.MediaId);
    }

    private record ImportFromUrlDto(Guid MediaId);
}
