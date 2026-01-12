using MassTransit;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Contracts.Events;
using Publisher.Core.Entities;

namespace Publisher.Application.Publisher;

public class PublishRequestedConsumer(
    IApplicationDbContext dbContext,
    ILogger<PublishRequestedConsumer> logger,
    ISocialMediaPublisherFactory socialMediaPublisherFactory
) : IConsumer<PublishRequested>
{
    public async Task Consume(ConsumeContext<PublishRequested> context)
    {
        var autoListEntryId = context.Message.AutoListEntryId;
        var requestedTime = context.Message.Time;

        var autoListEntry = await dbContext.AutoListEntries
            .Include(entry => entry.AutoList)
            .ThenInclude(al => al.Accounts)
            .Include(entry => entry.AutoList)
            .ThenInclude(al => al.InstagramPreset)
            .SingleOrDefaultAsync(x => x.Id == autoListEntryId, context.CancellationToken);

        Guard.Against.NotFound(autoListEntryId, autoListEntry);

        var autoList = autoListEntry.AutoList;

        var postContainerId = autoList.PostContainerId;

        var post = await RetrieveVideoForPublishingFromPostContainerAsync(postContainerId);

        if (post is null)
        {
            logger.LogWarning("No posts were found for container: {PostContainerId}", postContainerId);
            return;
        }


        var publicationSettings = PublicationSettings.Default;

        if (autoList.InstagramPreset is not null)
            publicationSettings.InstagramSettings = autoList.InstagramPreset;


        foreach (var account in autoListEntry.AutoList.Accounts)
        {
            var postConfig = new SocialMediaPostConfig(
                post.FileKey,
                post.Description,
                post.CoverFileKey,
                account,
                publicationSettings
            );
            var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(account.SocialMedia);
            await publisher.PostVideoAsync(postConfig);
        }
    }

    private async Task<CreatedPost?> RetrieveVideoForPublishingFromPostContainerAsync(Guid postContainerId)
    {
        var postContainer = await dbContext.PostContainers
            .SingleOrDefaultAsync(x => x.Id == postContainerId);

        Guard.Against.NotFound(postContainerId, postContainer);

        var lastPublishedPostId = postContainer.LastPublishedPostId;
        if (lastPublishedPostId is null)
            return await GetFirstPostFromContainer(postContainerId);

        var lastPublishedPost = await dbContext.CreatedPosts
            .SingleOrDefaultAsync(x => x.Id == lastPublishedPostId);

        Guard.Against.NotFound(lastPublishedPostId.Value, lastPublishedPost);

        var lastAddedTime = lastPublishedPost.CreatedAt;

        return await RetrieveNextVideoFromPostContainer(postContainerId, lastAddedTime);
    }

    private Task<CreatedPost?> GetFirstPostFromContainer(Guid postContainerId)
    {
        return dbContext.CreatedPosts
                .Where(x => x.PostContainerId == postContainerId)
                .OrderBy(x => x.CreatedAt)
                .FirstOrDefaultAsync();
    }

    private async Task<CreatedPost?> RetrieveNextVideoFromPostContainer(Guid postContainerId, DateTime lastPublishedCreatedAt)
    {
        var afterLastPublished = await dbContext.CreatedPosts
            .Where(x => x.PostContainerId == postContainerId && x.CreatedAt > lastPublishedCreatedAt)
            .FirstOrDefaultAsync();

        if (afterLastPublished is null)
            return await GetFirstPostFromContainer(postContainerId);
        return afterLastPublished;
    }
}
