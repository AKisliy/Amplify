using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Exceptions;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Instagram;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Instagram;
using Publisher.Core.Constants;
using Publisher.Core.Entities;
using Publisher.Core.Enums;

namespace Publisher.Application.Publisher;

public class InstagramPublisher(
    IInstagramApiClient instagramApiClient,
    ILogger<InstagramPublisher> logger,
    ITokenProtector tokenProtector,
    IFileStorage fileStorage
) : ISocialMediaPublisher
{
    public SocialMedia SocialMedia => SocialMedia.Instagram;

    public async Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig postConfig)
    {
        var instPreset = postConfig.PublicationSettings.InstagramSettings;

        using var scope = SetupLoggingScope(postConfig);
        var videoKey = postConfig.PostFileKey;
        var coverKey = postConfig.CoverFileKey;
        var credentials = GetCredentials(postConfig.Account);

        var videoUrl = await fileStorage.GetPresignedUrl(videoKey);

        if (coverKey is not null)
            coverKey = await fileStorage.GetPresignedUrl(coverKey);

        var reelData = new InstagramReelData(
            videoUrl,
            postConfig.Description,
            coverKey,
            instPreset.ShareToFeed
        );

        var creationResponse = await instagramApiClient.CreateReelContainerAsync(reelData, credentials);
        var creationId = creationResponse.Id;
        if (creationId is null)
        {
            await HandleErrorResponse(creationResponse);
            return PublicationResult.Failed;
        }

        var uploadCompletionResponse = await instagramApiClient.WaitForContainerUploadAsync(creationId, credentials.AccessToken);
        if (uploadCompletionResponse.StatusCode != InstagramApi.UploadStatus.Finished)
        {
            await HandleErrorResponse(uploadCompletionResponse);
            return PublicationResult.Failed;
        }

        var publishResponse = await instagramApiClient.PublishAsync(credentials, creationId);
        if (publishResponse.Id == null)
        {
            await HandleErrorResponse(publishResponse);
            return PublicationResult.Failed;
        }

        var postLink = await instagramApiClient.GetPostLink(publishResponse.Id, credentials.AccessToken);

        return new(PublicationStatus.Published, postLink);
    }

    private InstagramCredentials GetCredentials(SocialMediaAccount account)
    {
        var unprotectedToken = tokenProtector.Unprotect(account.AccessToken, SocialMedia.Instagram);
        var accountUserId = account.ProviderUserId;
        if (unprotectedToken == null)
        {
            logger.LogError("Couldn't unprotect token for account: {AccountId}", accountUserId);
            throw new InstagramException($"Couldn't unprotect token for account: {accountUserId}");
        }
        return new(
            accountUserId,
            unprotectedToken
        );
    }

    private IDisposable? SetupLoggingScope(SocialMediaPostConfig video)
    {
        return logger.BeginScope(new Dictionary<string, object>
        {
            ["Process"] = "InstagramVideoPublishing",
            ["AccountId"] = video.Account.ProviderUserId,
            ["VideoPath"] = video.PostFileKey,
        });
    }

    private Task HandleErrorResponse(InstagramApiResponse response)
    {
        if (response.Error != null)
        {
            logger.LogError("Instagram returned error: {ErrorMessage} ({Subcode})", response.Error.Message, response.Error.ErrorSubcode);
        }
        else if (response.DebugInfo != null)
        {
            logger.LogError("Instagram returned debug info: {RawMessage}", response.DebugInfo.RawMessage);
        }
        return Task.CompletedTask;
    }
}
