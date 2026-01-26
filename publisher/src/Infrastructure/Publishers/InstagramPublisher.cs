using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Clients.Instagram;
using Publisher.Infrastructure.Constants;
using Publisher.Infrastructure.Models.Instagram;

namespace Publisher.Infrastructure.Publishers;

public class InstagramPublisher(
    InstagramApiClient instagramApiClient,
    ILogger<InstagramPublisher> logger,
    IFileStorage fileStorage,
    IApplicationDbContext dbContext) : ISocialMediaPublisher
{
    public SocialProvider SocialMedia => SocialProvider.Instagram;

    public async Task<PublicationResult> PostVideoAsync(SocialMediaPostConfig postConfig)
    {
        var instPreset = postConfig.PublicationSettings.InstagramSettings;

        using var scope = SetupLoggingScope(postConfig);
        var videoKey = postConfig.PostFileId;
        var coverKey = postConfig.CoverFileId;
        var credentials = await GetCredentialsAsync(postConfig.AccountId);

        var videoUrl = await fileStorage.GetPresignedUrlAsync(videoKey);
        var coverUrl = string.Empty;

        if (coverKey != null)
        {
            coverUrl = await fileStorage.GetPresignedUrlAsync(coverKey.Value);
        }


        var reelData = new InstagramReelData(
            videoUrl,
            postConfig.Description,
            coverUrl,
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

    private async Task<InstagramCredentials> GetCredentialsAsync(Guid accountId)
    {
        var account = await dbContext.SocialAccounts.FindAsync(accountId);

        Guard.Against.NotFound(accountId, account, nameof(account));

        var credentials = JsonConvert.DeserializeObject<InstagramCredentials>(account.Credentials);

        Guard.Against.Null(credentials, message: "Couldn't deserialize data as valid Instagram credentials");

        return credentials;
    }

    private IDisposable? SetupLoggingScope(SocialMediaPostConfig video)
    {
        return logger.BeginScope(new Dictionary<string, object>
        {
            ["Process"] = "InstagramVideoPublishing",
            ["AccountId"] = video.AccountId,
            ["VideoPath"] = video.PostFileId,
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
