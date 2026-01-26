using Publisher.Domain.Entities;
using Publisher.Infrastructure.Models.Instagram;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramPayloadBuilder
{
    public HttpContent BuildReelCreationPayload(InstagramReelData reelData, InstagramCredentials credentials)
    {
        var payload = new Dictionary<string, string>
        {
                { PayloadFieldName.MediaType, MediaType.Reels },
                { PayloadFieldName.VideoUrl, reelData.PostUrl },
                { PayloadFieldName.UploadType, UploadType.Resumable },
                { PayloadFieldName.AccessToken, credentials.AccessToken },
                { PayloadFieldName.ShareToFeed, reelData.ShareToFeed.ToString().ToLower() }
        };

        if (!string.IsNullOrEmpty(reelData.Description))
            payload[PayloadFieldName.Caption] = reelData.Description;
        if (!string.IsNullOrEmpty(reelData.CoverUrl))
            payload[PayloadFieldName.CoverUrl] = reelData.CoverUrl;

        return new FormUrlEncodedContent(payload);
    }

    public HttpContent BuildPublishPayload(string creationId, string accessToken)
    {
        var publishPayload = new Dictionary<string, string>
            {
                { PayloadFieldName.CreationId, creationId },
                { PayloadFieldName.AccessToken, accessToken }
            };

        return new FormUrlEncodedContent(publishPayload);
    }
}
