using Contracts.Events;
using MassTransit;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;

namespace Publisher.Infrastructure;

public class PublicationStatusNotifier(
    IPublishEndpoint publishEndpoint,
    IApplicationDbContext dbContext) : IPublicationStatusNotifier
{
    public async Task NotifyPublicationStatusChangedAsync(PublicationRecord publicationRecord, CancellationToken cancellationToken)
    {
        var mediaPost = dbContext.MediaPosts
            .FirstOrDefault(mp => mp.Id == publicationRecord.MediaPostId);

        Guard.Against.Null(mediaPost, nameof(mediaPost));

        // TODO: Handle error case and pass error message
        var message = new PublicationStatusChanged
        {
            UserId = mediaPost.UserId.ToString(),
            PublicationRecordId = publicationRecord.Id,
            Status = publicationRecord.Status.ToString(),
            PublicUrl = publicationRecord.PublicUrl,
            PublicationErrorMessage = publicationRecord.PublicationErrorMessage
        };

        await publishEndpoint.Publish(message, cancellationToken);
    }
}
