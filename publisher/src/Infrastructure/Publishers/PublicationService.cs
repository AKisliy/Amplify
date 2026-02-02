using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Domain.Enums;
using Publisher.Domain.Events.Publications;
using Publisher.Domain.Exceptions;

namespace Publisher.Infrastructure.Publishers;

public class PublicationService(
    ILogger<PublicationService> logger,
    ISocialMediaPublisherFactory socialMediaPublisherFactory,
    IApplicationDbContext applicationDbContext) : IPublicationService
{
    [AutomaticRetry(Attempts = 3)]
    public async Task PublishPostAsync(Guid publicationRecordId, CancellationToken cancellationToken)
    {
        var publicationRecord = applicationDbContext.PublicationRecords
            .Include(pr => pr.MediaPost)
            .FirstOrDefault(pr => pr.Id == publicationRecordId);

        Guard.Against.NotFound(publicationRecordId, publicationRecord, "Publication record not found");

        var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(publicationRecord.Provider);

        var publicationSettings = publicationRecord.MediaPost.PublicationSettings;

        var config = new SocialMediaPostConfig(
            publicationRecord.MediaPost.MediaId,
            publicationRecord.MediaPost.Description,
            publicationRecord.MediaPost.CoverMediaId,
            publicationRecord.SocialAccountId,
            publicationSettings);

        publicationRecord.Status = PublicationStatus.Pending;
        publicationRecord.AddDomainEvent(new PublicationRecordStatusChangedEvent(publicationRecord));
        await applicationDbContext.SaveChangesAsync(cancellationToken);

        var result = await publisher.PostVideoAsync(config);

        if (result.Status == PublicationStatus.Failed)
        {
            logger.LogWarning("Failed to publish post {PublicationRecordId}", publicationRecordId);

            // TODO: maybe add exception details to the record
            publicationRecord.Status = PublicationStatus.Failed;
            publicationRecord.AddDomainEvent(new PublicationRecordStatusChangedEvent(publicationRecord));
            await applicationDbContext.SaveChangesAsync(cancellationToken);

            // throw exception to trigger retry
            throw new PublishingException("Publication failed");
        }

        if (result.Status == PublicationStatus.Published)
        {
            publicationRecord.PublicUrl = result.PublicUrl;
        }

        publicationRecord.Status = PublicationStatus.Published;
        publicationRecord.AddDomainEvent(new PublicationRecordStatusChangedEvent(publicationRecord));
        await applicationDbContext.SaveChangesAsync(cancellationToken);
    }
}
