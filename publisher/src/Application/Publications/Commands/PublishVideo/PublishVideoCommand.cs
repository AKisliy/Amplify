using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;
using Publisher.Domain.Enums;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.Commands.PublishVideo;

public record PublishVideoCommand(
    Guid MediaId,
    Guid ProjectId,
    IReadOnlyList<Guid> AccountIds,
    string? Description,
    Guid? CoverMediaId,
    InstagramSettingsDto? InstagramPublishingPreset = null) : IRequest<MediaPostResponseDto>;

public class PublishVideoCommandHandler(
    ILogger<PublishVideoCommandHandler> logger,
    IApplicationDbContext dbContext,
    ISocialMediaPublisherFactory socialMediaPublisherFactory,
    IUser user,
    IMapper mapper) : IRequestHandler<PublishVideoCommand, MediaPostResponseDto>
{
    public async Task<MediaPostResponseDto> Handle(PublishVideoCommand request, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        Guard.Against.Null(userId, nameof(userId));

        logger.LogInformation(
            "Publishing video {MediaId} for project {ProjectId} to accounts: {AccountIds} (user {UserId})",
            request.MediaId, request.ProjectId, string.Join(", ", request.AccountIds), userId);

        var mediaPost = new MediaPost
        {
            MediaId = request.MediaId,
            ProjectId = request.ProjectId,
            UserId = userId.Value,
            Description = request.Description,
            CoverMediaId = request.CoverMediaId,
            PublicationType = PublicationType.Manual,
        };

        var publicationSettings = new PublicationSettings();

        if (request.InstagramPublishingPreset is not null)
        {
            publicationSettings.Instagram = mapper.Map<InstagramSettings>(request.InstagramPublishingPreset);
        }

        dbContext.MediaPosts.Add(mediaPost);

        var accounts = dbContext.SocialAccounts
            .Where(acc => request.AccountIds.Contains(acc.Id))
            .ToList();

        foreach (var account in accounts)
        {
            var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(account.Provider);

            var publicationRecord = new PublicationRecord
            {
                MediaPost = mediaPost,
                SocialAccountId = account.Id,
                Status = PublicationStatus.Scheduled,
                Provider = account.Provider
            };

            publicationRecord.AddDomainEvent(new PublicationRecordCreated(publicationRecord));

            dbContext.PublicationRecords.Add(publicationRecord);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Published video {MediaId} for project {ProjectId} to accounts: {AccountIds}",
            request.MediaId, request.ProjectId, string.Join(", ", request.AccountIds));

        return mapper.Map<MediaPostResponseDto>(mediaPost);
    }
}