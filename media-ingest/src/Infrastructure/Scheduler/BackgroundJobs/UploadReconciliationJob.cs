using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.Scheduler.BackgroundJobs;

public class UploadReconciliationJob(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage,
    ILogger<UploadReconciliationJob> logger)
{
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan AbandonedThreshold = TimeSpan.FromMinutes(35);

    public async Task ExecuteAsync()
    {
        var now = DateTimeOffset.UtcNow;

        var staleFiles = await dbContext.MediaFiles
            .Where(f => f.ProcessingStatus == MediaProcessingStatus.PendingUpload
                        && f.CreatedAt < now - StaleThreshold)
            .ToListAsync();

        if (staleFiles.Count == 0)
            return;

        logger.LogInformation("Reconciliation: checking {Count} stale uploads", staleFiles.Count);

        foreach (var file in staleFiles)
        {
            var exists = await fileStorage.FileExistsAsync(file.FileKey);

            if (exists)
            {
                file.ProcessingStatus = MediaProcessingStatus.Uploaded;
                logger.LogInformation("Reconciliation: marked {MediaId} as Uploaded", file.Id);
            }
            else if (file.CreatedAt < now - AbandonedThreshold)
            {
                file.ProcessingStatus = MediaProcessingStatus.Failed;
                logger.LogWarning("Reconciliation: marked {MediaId} as Failed (abandoned upload)", file.Id);
            }
        }

        await dbContext.SaveChangesAsync(CancellationToken.None);
    }
}
