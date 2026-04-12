using Contracts;
using MassTransit;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.Consumers;

public class MediaProcessingCompletedConsumer(
    IApplicationDbContext dbContext,
    ILogger<MediaProcessingCompletedConsumer> logger) : IConsumer<MediaProcessingCompleted>
{
    public async Task Consume(ConsumeContext<MediaProcessingCompleted> context)
    {
        var message = context.Message;

        var mediaFile = await dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == message.MediaId, context.CancellationToken);

        if (mediaFile is null)
        {
            logger.LogWarning("MediaFile {MediaId} not found, skipping", message.MediaId);
            return;
        }

        if (message.Success)
        {
            mediaFile.ThumbnailTinyKey = message.ThumbTinyKey;
            mediaFile.ThumbnailMediumKey = message.ThumbMediumKey;
            mediaFile.ProcessingStatus = MediaProcessingStatus.Ready;
            logger.LogInformation("MediaFile {MediaId} processing completed successfully", message.MediaId);
        }
        else
        {
            mediaFile.ProcessingStatus = MediaProcessingStatus.Failed;
            logger.LogWarning("MediaFile {MediaId} processing failed: {Error}", message.MediaId, message.Error);
        }

        await dbContext.SaveChangesAsync(context.CancellationToken);
    }
}
