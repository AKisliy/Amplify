using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.Commands.PublishNextPostInAutoList;

public record PublishNextPostInAutoListCommand(
    Guid AutoListEntryId,
    DateTimeOffset RequestedPublicationTime) : IRequest;

public class PublishNextPostInAutoListCommandHandler(
    ILogger<PublishNextPostInAutoListCommandHandler> logger,
    IApplicationDbContext dbContext) : IRequestHandler<PublishNextPostInAutoListCommand>
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

        var publicationSettings = autoList.PublicationSettings;

        foreach (var account in autoListEntry.AutoList.Accounts)
        {
            var publicationRecord = new PublicationRecord()
            {
                MediaPostId = post.Id,
                SocialAccountId = account.Id,
                Status = PublicationStatus.Scheduled,
                Provider = account.Provider,
            };
            publicationRecord.AddDomainEvent(new PublicationRecordCreated(publicationRecord));
            dbContext.PublicationRecords.Add(publicationRecord);
        }
        post.ProcessedInAutoList = true;
        dbContext.MediaPosts.Update(post);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<MediaPost?> RetrieveMediaForPublishingInAutoList(Guid autoListId)
    {
        var media = await dbContext.MediaPosts
            .Where(x => x.AutoListId == autoListId && !x.ProcessedInAutoList)
            .OrderBy(x => x.Created)
            .FirstOrDefaultAsync();

        return media;
    }
}

