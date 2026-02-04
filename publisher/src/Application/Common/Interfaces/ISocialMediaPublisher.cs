using Publisher.Application.Common.Models;
using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface ISocialMediaPublisher
{
    SocialProvider SocialMedia { get; }
    Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig video);
}