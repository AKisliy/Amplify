using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Domain.Enums;

namespace Publisher.Infrastructure.Publishers;

public class DummyInstagramPublisher(ILogger<DummyInstagramPublisher> logger) : ISocialMediaPublisher
{
    private const string SamplePostUrl = "https://www.instagram.com/reel/DRNUn-ViDXv";

    public SocialProvider SocialMedia => SocialProvider.Instagram;

    public async Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig video)
    {
        logger.LogInformation("Dummy publishing video {PostFileId} to Instagram account {AccountId}",
            video.PostFileId, video.AccountId);
        await Task.Delay(2000);

        var result = new PublicationResult(PublicationStatus.Published, SamplePostUrl);

        return result;
    }
}
