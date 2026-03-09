using Flurl;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration.Options;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramUrlBuilder(IOptions<InstagramApiOptions> config)
{
    private readonly InstagramApiOptions _options = config.Value;

    public string GetMediaCreationUrl(string userId)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(userId)
            .AppendPathSegment("media")
            .ToString();
    }

    public string GetMediaResumableUploadUrl(string creationId)
    {
        return new Url(_options.ResumableUploadHostUrl)
            .AppendPathSegment("ig-api-upload")
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(creationId)
            .ToString();
    }

    public string GetStatusUrl(string creationId, string accessToken)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(creationId)
            .AppendQueryParam("fields", PayloadFieldName.StatusCode)
            .AppendQueryParam("access_token", accessToken)
            .ToString();
    }

    public string GetPublishUrl(string userId)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(userId)
            .AppendPathSegment("media_publish")
            .ToString();
    }

    public string GetUrlForShortcode(string instagramMediaId, string accessToken)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(instagramMediaId)
            .AppendQueryParam("fields", PayloadFieldName.ShortCode)
            .AppendQueryParam("access_token", accessToken)
            .ToString();
    }

    public string GetUrlForLongLivedTokenExchange(string shortLivedToken)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment("access_token")
            .SetQueryParam("grant_type", "ig_exchange_token")
            .SetQueryParam("client_id", _options.AppId)
            .SetQueryParam("client_secret", _options.AppSecret)
            .SetQueryParam("access_token", shortLivedToken)
            .ToString();
    }

    public string GetUrlForUserInfo(string accessToken, List<string>? fields = null)
    {
        var fieldsParam = fields?.Any() == true ? string.Join(",", fields) : "id,username,profile_picture_url";

        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment("me")
            .AppendQueryParam("fields", fieldsParam)
            .AppendQueryParam("access_token", accessToken)
            .ToString();
    }

    public string GetUrlForTokenRefresh(string longLivedAccessToken)
    {
        return new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment("refresh_access_token")
            .SetQueryParam("grant_type", "ig_refresh_token")
            .SetQueryParam("access_token", longLivedAccessToken)
            .ToString();
    }

    public string FormPostLink(string shortcode)
    {
        return $"https://instagram.com/p/{shortcode}";
    }

    public string GetUrlForLogin(IEnumerable<string> scopes, string? encodedState = null)
    {
        var url = new Url("https://www.instagram.com/oauth/authorize")
            .SetQueryParam("client_id", _options.AppId)
            .SetQueryParam("redirect_uri", _options.RedirectUri)
            .SetQueryParam("scope", string.Join(',', scopes))
            .SetQueryParam("response_type", "code");

        if (!string.IsNullOrEmpty(encodedState))
            url = url.SetQueryParam("state", encodedState);

        return url.ToString();
    }
}
