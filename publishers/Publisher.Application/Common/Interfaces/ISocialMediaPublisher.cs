using Publisher.Application.Common.Models;
using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface ISocialMediaPublisher
{
    SocialMedia SocialMedia { get; }
    Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig video);
}