using Publisher.Application.Common.Models.Instagram;

namespace Publisher.Application.Common.Interfaces.Instagram;

public interface IInstagramApiClient
{
    Task<InstagramApiResponse> CreateReelContainerAsync(InstagramReelData reelData, InstagramCredentials credentials);
    Task<InstagramApiResponse> UploadVideoToContainerAsync(string videoPath, string accessToken, string creationId);
    Task<InstagramApiResponse> GetContainerStatus(string creationId, string accessToken);
    Task<InstagramApiResponse> PublishAsync(InstagramCredentials credentials, string creationId);
    Task<InstagramApiResponse> WaitForContainerUploadAsync(string creationId, string accessToken, CancellationToken token = default);
    Task<string> GetPostLink(string instagramMediaId, string accessToken);
}
