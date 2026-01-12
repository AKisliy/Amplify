using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces.Factory;

public interface ISocialMediaPublisherFactory
{
    ISocialMediaPublisher GetSocialMediaPublisher(SocialMedia socialMedia);
}
