using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Core.Enums;

namespace Publisher.Infrastructure.Factory;

public class SocialMediaPublisherFactory(
    IEnumerable<ISocialMediaPublisher> publishers,
    ILogger<SocialMediaPublisherFactory> logger) : ISocialMediaPublisherFactory
{
    public ISocialMediaPublisher GetSocialMediaPublisher(SocialMedia socialMedia)
    {
        var publisher = publishers.FirstOrDefault(x => x.SocialMedia == socialMedia);

        if (publisher == null)
        {
            logger.LogWarning("No publisher implemented for social media {SocialMedia}", socialMedia);
            throw new NotImplementedException($"No publisher implemented for social media {socialMedia}");
        }

        return publisher;
    }
}
