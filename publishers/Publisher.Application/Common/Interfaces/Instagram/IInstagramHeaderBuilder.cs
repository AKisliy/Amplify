namespace Publisher.Application.Common.Interfaces.Instagram;

public interface IInstagramHeaderBuilder
{
    void AddResumableUploadHeaders(HttpRequestMessage message, string accessToken, long fileSize, int fileOffset = 0);
}
