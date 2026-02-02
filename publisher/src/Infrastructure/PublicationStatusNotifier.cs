using Microsoft.AspNetCore.SignalR;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;
using Publisher.Infrastructure.Hubs;
using Publisher.Infrastructure.Receivers;

namespace Publisher.Infrastructure;

public class PublicationStatusNotifier(
    IHubContext<PublisherHub, IPublisherReceiver> hubContext,
    IApplicationDbContext dbContext) : IPublicationStatusNotifier
{
    public async Task NotifyPublicationStatusChangedAsync(PublicationRecord publicationRecord)
    {
        var mediaPost = dbContext.MediaPosts
            .FirstOrDefault(mp => mp.Id == publicationRecord.MediaPostId);

        Guard.Against.Null(mediaPost, nameof(mediaPost));

        // TODO: Handle error case and pass error message
        await hubContext.Clients.User(mediaPost.UserId.ToString()).OnPublicationStatusChanged(
            publicationRecord.Id,
            publicationRecord.Status.ToString(),
            publicationRecord.PublicUrl,
            "");
    }
}
