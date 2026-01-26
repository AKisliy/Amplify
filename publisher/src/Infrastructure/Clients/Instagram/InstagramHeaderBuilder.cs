using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramHeaderBuilder
{
    public void AddResumableUploadHeaders(HttpRequestMessage message, string accessToken, long fileSize, int fileOffset = 0)
    {
        message.Headers.Add(HeaderFieldName.Authorization, $"OAuth {accessToken}");
        message.Headers.Add(HeaderFieldName.UploadFileOffset, fileOffset.ToString());
        message.Headers.Add(HeaderFieldName.UploadFileSize, fileSize.ToString());
    }
}
