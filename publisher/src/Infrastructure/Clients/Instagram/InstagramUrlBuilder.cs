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
        var url = new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(userId)
            .AppendPathSegment("media");
        return url.ToString();
    }

    public string GetMediaResumableUploadUrl(string creationId)
    {
        var url = new Url(_options.ResumableUploadHostUrl)
            .AppendPathSegment("ig-api-upload")
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(creationId);
        return url.ToString();
    }

    public string GetStatusUrl(string creationId, string accessToken)
    {
        var url = new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(creationId)
            .AppendQueryParam("fields", PayloadFieldName.StatusCode)
            .AppendQueryParam("access_token", accessToken);
        return url.ToString();
    }

    public string GetPublishUrl(string userId)
    {
        var url = new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(userId)
            .AppendPathSegment("media_publish");
        return url.ToString();
    }

    public string GetUrlForShortcode(string instagramMediaId, string accessToken)
    {
        var url = new Url(_options.BaseGraphHostUrl)
            .AppendPathSegment(_options.ApiVersion)
            .AppendPathSegment(instagramMediaId)
            .AppendQueryParam("fields", PayloadFieldName.ShortCode)
            .AppendQueryParam("access_token", accessToken);

        return url.ToString();
    }

    public string GetUrlForShortLivedToken(string code)
    {
        var clientId = _options.AppId;
        var clientSecret = _options.AppSecret;
        var redirectUri = _options.RedirectUri;

        var url = new Url("https://graph.facebook.com/v18.0/oauth/access_token")
            .SetQueryParam("client_id", clientId)
            .SetQueryParam("redirect_uri", redirectUri)
            .SetQueryParam("client_secret", clientSecret)
            .SetQueryParam("code", code);

        return url;
    }

    public string GetUrlForLongLivedToken(string shortLivedToken)
    {
        var url = new Url("https://graph.facebook.com/v18.0/oauth/access_token")
            .SetQueryParam("grant_type", "fb_exchange_token")
            .SetQueryParam("client_id", _options.AppId)
            .SetQueryParam("client_secret", _options.AppSecret)
            .SetQueryParam("fb_exchange_token", shortLivedToken);

        return url;
    }

    public string GetUrlForFacebookAccounts(string accessToken)
    {
        var url = new Url("https://graph.facebook.com/v18.0/me/accounts")
            .SetQueryParam("fields", "instagram_business_account{id,username,profile_picture_url},name", isEncoded: true)
            .SetQueryParam("access_token", accessToken);

        return url;
    }

    public string GetUrlForTokenRefresh(string longLivedAccessToken)
    {
        return new Url("https://graph.instagram.com/refresh_access_token")
            .SetQueryParam("grant_type", "ig_refresh_token")
            .SetQueryParam("access_token", longLivedAccessToken);
    }

    public string FormPostLink(string shortcode)
    {
        return $"https://instagram.com/p/{shortcode}";
    }
}
