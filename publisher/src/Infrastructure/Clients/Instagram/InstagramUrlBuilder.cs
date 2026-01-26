using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration.Options;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramUrlBuilder(IOptions<InstagramApiOptions> config)
{
    private readonly InstagramApiOptions _options = config.Value;

    public string GetMediaCreationUrl(string userId)
    {
        return $"{_options.BaseGraphHostUrl}/{_options.ApiVersion}/{userId}/media";
    }

    public string GetMediaResumableUploadUrl(string creationId)
    {
        return $"{_options.ResumableUploadHostUrl}/ig-api-upload/{_options.ApiVersion}/{creationId}";
    }

    public string GetStatusUrl(string creationId, string accessToken)
    {
        string baseUrl = $"{_options.BaseGraphHostUrl}/{_options.ApiVersion}/{creationId}";

        var queryParams = new Dictionary<string, string?>
        {
            { "fields", PayloadFieldName.StatusCode },
            { "access_token", accessToken }
        };

        return QueryHelpers.AddQueryString(baseUrl, queryParams);
    }

    public string GetPublishUrl(string userId)
    {
        return $"{_options.BaseGraphHostUrl}/{_options.ApiVersion}/{userId}/media_publish";
    }

    public string GetUrlForShortcode(string instagramMediaId, string accessToken)
    {
        var baseUrl = $"{_options.BaseGraphHostUrl}/{_options.ApiVersion}/{instagramMediaId}";

        var queryParams = new Dictionary<string, string?>
        {
            { "fields", PayloadFieldName.ShortCode},
            { "access_token", accessToken }
        };

        return QueryHelpers.AddQueryString(baseUrl, queryParams);
    }

    public string FormPostLink(string shortcode)
    {
        return $"https://instagram.com/p/{shortcode}";
    }
}
