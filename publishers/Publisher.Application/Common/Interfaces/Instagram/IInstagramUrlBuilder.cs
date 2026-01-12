namespace Publisher.Application.Common.Interfaces.Instagram;

public interface IInstagramUrlBuilder
{
    string GetMediaCreationUrl(string userId);
    string GetUrlForShortcode(string mediaId, string token);
    string GetStatusUrl(string creationId, string token);
    string GetPublishUrl(string userId);
    string GetMediaResumableUploadUrl(string creationId);
    string FormPostLink(string shortCode);
}
