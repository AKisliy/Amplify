using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Clients.TikTok;
using Publisher.Infrastructure.Models.TikTok;

namespace Publisher.Infrastructure.Publishers;

public class TikTokPublisher(
    IApplicationDbContext dbContext,
    IFileStorage fileStorage,
    TikTokApiClient tikTokApiClient) : ISocialMediaPublisher
{
    public SocialProvider SocialMedia => SocialProvider.TikTok;

    public async Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig video, CancellationToken cancellationToken)
    {
        var creds = await GetCredentialsAsync(video.AccountId);

        var url = await fileStorage.GetPublicUrlAsync(video.PostFileId);

        var creatorInfo = await tikTokApiClient.GetCreatorDataAsync(creds.AccessToken, cancellationToken);
        var privacyLevel = creatorInfo.Data?.PrivacyLevelOptions[0];

        Guard.Against.Null(privacyLevel, message: "Couldn't determine privacy level for the post");

        TikTokPostInfo postInfo = new TikTokPostInfo
        {
            PrivacyLevel = TikTokPrivacyLevel.SELF_ONLY,
            Title = "Funny #cat video",
            DisableComment = true,
            VideoCoverTimestampMs = 1000
        };

        if (creatorInfo.Data?.DuetDisabled == true)
            postInfo = postInfo with { DisableDuet = true };

        if (creatorInfo.Data?.StitchDisabled == true)
            postInfo = postInfo with { DisableStitch = true };

        if (creatorInfo.Data?.CommentDisabled == true)
            postInfo = postInfo with { DisableComment = true };

        var request = new TikTokVideoInitRequest
        {
            PostInfo = postInfo,
            SourceInfo = new TikTokSourceInfo
            {
                Source = TikTokSourceType.PULL_FROM_URL,
                VideoUrl = url
            }
        };

        await tikTokApiClient.InitializeVideoPostAsync(creds.AccessToken, request, cancellationToken);

        return new PublicationResult(PublicationStatus.Published, "https://www.tiktok.com/@someuser/video/1234567890");
    }

    private async Task<TikTokCredentials> GetCredentialsAsync(Guid accountId)
    {
        var account = await dbContext.SocialAccounts.FindAsync(accountId);

        Guard.Against.NotFound(accountId, account, nameof(account));

        var credentials = JsonConvert.DeserializeObject<TikTokCredentials>(account.Credentials);

        Guard.Against.Null(credentials, message: "Couldn't deserialize data as valid TikTok credentials");

        return credentials;
    }
}
