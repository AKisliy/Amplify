using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Interfaces.Factory;

public interface ISocialMediaPublisherFactory
{
    ISocialMediaPublisher GetSocialMediaPublisher(SocialProvider socialMedia);
}

