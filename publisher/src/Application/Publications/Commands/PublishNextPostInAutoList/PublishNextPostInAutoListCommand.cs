using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;
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
            .SingleOrDefaultAsync(x => x.Id == autoListEntryId, cancellationToken);

        Guard.Against.NotFound(autoListEntryId, autoListEntry);

        var autoList = autoListEntry.AutoList;

        var post = await RetrieveMediaForPublishingInAutoList(autoList.Id);

        if (post is null)
        {
            logger.LogWarning("No posts were found for container: {PostContainerId}", autoList.Id);
            return;
        }

        // TODO: add publication settings to autolist
        var publicationSettings = new PublicationSettings();

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
        // TODO: implement logic to avoid republishing the same post
        // previously was based on Status.Published check
        var media = await dbContext.MediaPosts
            .Where(x => x.AutoListId == autoListId)
            .OrderBy(x => x.Created)
            .FirstOrDefaultAsync();

        return media;
    }
}

