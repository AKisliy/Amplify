using Publisher.Application.Common.Models.Instagram;

namespace Publisher.Application.Common.Interfaces.Instagram;

public interface IInstagramPayloadBuilder
{
    HttpContent BuildReelCreationPayload(InstagramReelData reelData, InstagramCredentials credentials);
    HttpContent BuildPublishPayload(string creationId, string accessToken);
}

