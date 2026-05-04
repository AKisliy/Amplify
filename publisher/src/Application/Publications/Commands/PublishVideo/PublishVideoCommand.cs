using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Application.Publications.Commands.PublishVideo;

public record PublishVideoCommand(
    Guid MediaPostId,
    IReadOnlyList<Guid> AccountIds,
    string? Description,
    Guid? CoverMediaId,
    DateTimeOffset? ScheduledAt,
    InstagramSettingsDto? InstagramSettings = null) : IRequest<List<PublicationRecordResponseDto>>;

internal sealed class PublishVideoCommandHandler(
    ILogger<PublishVideoCommandHandler> logger,
    IApplicationDbContext dbContext,
    ISocialMediaPublisherFactory socialMediaPublisherFactory,
    IUser user,
    IMapper mapper) : IRequestHandler<PublishVideoCommand, List<PublicationRecordResponseDto>>
{
    public async Task<List<PublicationRecordResponseDto>> Handle(PublishVideoCommand request, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        Guard.Against.Null(userId, nameof(userId));

        var mediaPost = await dbContext.MediaPosts.Where(mp => mp.Id == request.MediaPostId).FirstOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.MediaPostId, mediaPost, nameof(request.MediaPostId));

        logger.LogInformation(
            "Publishing video of {MediaPostId} to accounts: {AccountIds} (user {UserId})",
            request.MediaPostId, string.Join(", ", request.AccountIds), userId);

        var publicationSettings = new PublicationSettings();

        if (request.InstagramSettings is not null)
        {
            publicationSettings.Instagram = mapper.Map<InstagramSettings>(request.InstagramSettings);
        }

        var accounts = dbContext.SocialAccounts
            .Where(acc => request.AccountIds.Contains(acc.Id))
            .ToList();

        if (accounts.Count != request.AccountIds.Count)
        {
            var existingIds = accounts.Select(a => a.Id);
            var missingIds = request.AccountIds.Where(id => !existingIds.Contains(id));
            throw new NotFoundException($"The following account IDs do not exist: {string.Join(", ", missingIds)}", nameof(request.AccountIds));
        }

        var publicationRecords = new List<PublicationRecord>();

        foreach (var account in accounts)
        {
            var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(account.Provider);

            var publicationRecord = PublicationRecord.CreateManual(
                mediaPost.Id,
                account.Id,
                account.Provider,
                request.Description,
                request.ScheduledAt,
                publicationSettings
            );

            publicationRecords.Add(publicationRecord);
        }

        dbContext.PublicationRecords.AddRange(publicationRecords);

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Published video {MediaPostId} to accounts: {AccountIds}",
            request.MediaPostId, string.Join(", ", request.AccountIds));

        return mapper.Map<List<PublicationRecordResponseDto>>(publicationRecords);
    }
}