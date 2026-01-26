using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.Publications.Commands.PublishNextPostInAutoList;

public record PublishNextPostInAutoListCommand(
    Guid AutoListEntryId,
    DateTimeOffset RequestedPublicationTime) : IRequest;

// TOMORROW: continue here
public class PublishNextPostInAutoListCommandHandler(
    ILogger<PublishNextPostInAutoListCommandHandler> logger,
    IApplicationDbContext dbContext,
    ISocialMediaPublisherFactory socialMediaPublisherFactory) : IRequestHandler<PublishNextPostInAutoListCommand>
{
    public async Task Handle(PublishNextPostInAutoListCommand request, CancellationToken cancellationToken)
    {
        var autoListEntryId = request.AutoListEntryId;
        var requestedTime = request.RequestedPublicationTime;

        var autoListEntry = await dbContext.AutoListEntries
            .Include(entry => entry.AutoList)
            .ThenInclude(al => al.Accounts)
            .Include(entry => entry.AutoList)
            .ThenInclude(al => al.InstagramPreset)
            .SingleOrDefaultAsync(x => x.Id == autoListEntryId, cancellationToken);

        Guard.Against.NotFound(autoListEntryId, autoListEntry);

        var autoList = autoListEntry.AutoList;

        var post = await RetrieveMediaForPublishingInAutoList(autoList.Id);

        if (post is null)
        {
            logger.LogWarning("No posts were found for container: {PostContainerId}", autoList.Id);
            return;
        }

        var publicationSettings = PublicationSettings.Default;

        if (autoList.InstagramPreset is not null)
            publicationSettings.InstagramSettings = autoList.InstagramPreset;

        foreach (var account in autoListEntry.AutoList.Accounts)
        {
            var postConfig = new SocialMediaPostConfig(
                post.Id,
                post.Description,
                post.CoverMediaId,
                account.Id,
                publicationSettings
            );
            var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(account.Provider);
            await publisher.PostVideoAsync(postConfig);
        }
    }

    private async Task<MediaPost?> RetrieveMediaForPublishingInAutoList(Guid autoListId)
    {
        var media = await dbContext.MediaPosts
            .Where(x => x.AutoListId == autoListId && x.Status == PublicationStatus.Scheduled)
            .OrderBy(x => x.Created)
            .FirstOrDefaultAsync();

        return media;
    }
}

