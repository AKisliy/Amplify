using FluentValidation;
using Flurl;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Models.Exceptions;
using Publisher.Infrastructure.Models.TikTok;

namespace Publisher.Infrastructure.Clients.TikTok;

public class TikTokApiClient(
    HttpClient httpClient,
    ILogger<TikTokApiClient> logger,
    IOptions<TikTokApiOptions> tikTokOptions,
    IValidator<TikTokTokenResponse> responseValidator)
{
    public async Task<TikTokTokenResponse> ExchangeCodeForTokenAsync(string code, CancellationToken cancellationToken)
    {
        var requestBody = new Dictionary<string, string>
        {
            ["client_key"] = tikTokOptions.Value.ClientKey,
            ["client_secret"] = tikTokOptions.Value.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = tikTokOptions.Value.RedirectUri
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://open.tiktokapis.com/v2/oauth/token/")
        {
            Content = new FormUrlEncodedContent(requestBody)
        };

        var response = await httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"TikTok OAuth Error: {content}");
        }

        var tokenResponse = JsonConvert.DeserializeObject<TikTokTokenResponse>(content)
            ?? throw new Exception("Failed to deserialize TikTok token response.");

        await responseValidator.ValidateAndThrowAsync(tokenResponse, cancellationToken);

        return tokenResponse;
    }

    public async Task<TikTokUser> GetTikTokUserAsync(string accessToken, CancellationToken cancellationToken)
    {
        string[] fields = ["open_id", "union_id", "avatar_url", "display_name"];

        var url = new Url("https://open.tiktokapis.com/v2/user/info/")
            .SetQueryParam("fields", string.Join(',', fields), isEncoded: true);

        var request = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { { "Authorization", $"Bearer {accessToken}" } }
        };

        var response = await httpClient.SendAsync(request, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new TikTokException($"TikTok User Info Error: {content}");
        }

        var userResponse = JsonConvert.DeserializeObject<TikTokUserDataResponse>(content)
            ?? throw new TikTokException("Failed to deserialize TikTok user data response.");

        if (!string.IsNullOrEmpty(userResponse?.Error?.Message))
            throw new TikTokException($"TikTok returned error {userResponse?.Error.Message}");

        var user = userResponse?.Data?.User;

        if (user == null)
        {
            logger.LogInformation("The was no error in TikTok response, but returned user is null");
            throw new TikTokException();
        }

        return user;
    }
}
