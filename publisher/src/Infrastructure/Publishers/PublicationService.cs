using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Domain.Enums;
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
        var publicationRecord = await applicationDbContext.PublicationRecords
            .Include(pr => pr.MediaPost)
            .FirstOrDefaultAsync(pr => pr.Id == publicationRecordId, cancellationToken);

        Guard.Against.NotFound(publicationRecordId, publicationRecord);

        if (publicationRecord.Status != PublicationStatus.Processing)
        {
            publicationRecord.StartProcessing();
            await applicationDbContext.SaveChangesAsync(cancellationToken);
        }

        try
        {
            var publisher = socialMediaPublisherFactory.GetSocialMediaPublisher(publicationRecord.Provider);
            var publicationSettings = publicationRecord.MediaPost.PublicationSettings;

            var config = new SocialMediaPostConfig(
                publicationRecord.MediaPost.MediaId,
                publicationRecord.MediaPost.Description,
                publicationRecord.MediaPost.CoverMediaId,
                publicationRecord.SocialAccountId,
                publicationSettings);

            var result = await publisher.PostVideoAsync(config);

            if (result.Status == PublicationStatus.Failed)
            {
                throw new PublishingException(result.ErrorMessage ?? "Unknown error");
            }

            publicationRecord.MarkAsPublished(result.PublicUrl!);
            await applicationDbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Publishing failed");
            publicationRecord.MarkAsFailed(ex.Message);
            await applicationDbContext.SaveChangesAsync(cancellationToken);

            throw;
        }
    }
}
