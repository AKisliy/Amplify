using Publisher.Application.Common.Interfaces.Instagram;
using static Publisher.Core.Constants.InstagramApi;

namespace Publisher.Infrastructure.Instagram;

public class InstagramHeaderBuilder : IInstagramHeaderBuilder
{
    public void AddResumableUploadHeaders(HttpRequestMessage message, string accessToken, long fileSize, int fileOffset = 0)
    {
        message.Headers.Add(HeaderFieldName.Authorization, $"OAuth {accessToken}");
        message.Headers.Add(HeaderFieldName.UploadFileOffset, fileOffset.ToString());
        message.Headers.Add(HeaderFieldName.UploadFileSize, fileSize.ToString());
    }
}
