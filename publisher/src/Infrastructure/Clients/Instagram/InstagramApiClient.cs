using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly.Registry;
using Publisher.Domain.Entities;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Constants;
using Publisher.Infrastructure.Models.Exceptions;
using Publisher.Infrastructure.Models.Facebook;
using Publisher.Infrastructure.Models.Instagram;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramApiClient(
    HttpClient httpClient,
    ILogger<InstagramApiClient> logger,
    InstagramUrlBuilder urlBuilder,
    InstagramPayloadBuilder payloadBuilder,
    IOptions<InstagramApiOptions> options,
    ResiliencePipelineProvider<string> pipelineProvider)
{
    public async Task<InstagramApiResponse> CreateReelContainerAsync(InstagramReelData reelData, InstagramCredentials credentials)
    {
        var creationUrl = urlBuilder.GetMediaCreationUrl(credentials.InstagramUserId);
        var creationPayload = payloadBuilder.BuildReelCreationPayload(reelData, credentials);
        var creationResponse = await httpClient.PostAsync(creationUrl, creationPayload);
        return await HandleInstagramResponseAsync(creationResponse);
    }

    public async Task<string> GetPostLink(string instagramMediaId, string accessToken)
    {
        var url = urlBuilder.GetUrlForShortcode(instagramMediaId, accessToken);
        var response = await httpClient.GetAsync(url);
        var transformedResponse = await HandleInstagramResponseAsync(response);
        if (transformedResponse.ShortCode == null)
            throw new InstagramException("Instagram returned empty shortcode", transformedResponse.Error ?? new());
        return urlBuilder.FormPostLink(transformedResponse.ShortCode);
    }

    public async Task<InstagramApiResponse> WaitForContainerUploadAsync(string creationId, string accessToken, CancellationToken cancellationToken = default)
    {
        var pipeline = pipelineProvider.GetPipeline<InstagramApiResponse>(Pipelines.InstagramContainerStatusCheckPipelineName);
        var result = await pipeline.ExecuteAsync(
            async _ => await GetContainerStatus(creationId, accessToken),
            cancellationToken
        );

        return result.StatusCode == UploadStatus.InProgress
            ? new InstagramApiResponse
            {
                Error = new InstagramErrorDetail
                {
                    Message = $"Upload haven't completed in given time (waited {ContainerStatusQuery.MaxAttempts} x {ContainerStatusQuery.DelayMs} ms)"
                }
            }
            : result;
    }

    public async Task<InstagramApiResponse> GetContainerStatus(string creationId, string accessToken)
    {
        var statusUrl = urlBuilder.GetStatusUrl(creationId, accessToken);
        var statusResponse = await httpClient.GetAsync(statusUrl);
        return await HandleInstagramResponseAsync(statusResponse);
    }

    public async Task<InstagramApiResponse> PublishAsync(InstagramCredentials credentials, string creationId)
    {
        var publishUrl = urlBuilder.GetPublishUrl(credentials.InstagramUserId);
        var publishPayload = payloadBuilder.BuildPublishPayload(creationId, credentials.AccessToken);
        var apiResponse = await httpClient.PostAsync(publishUrl, publishPayload);
        return await HandleInstagramResponseAsync(apiResponse);
    }

    /// <summary>
    /// Instagram Login API: exchanges authorization code for a short-lived token.
    /// POST https://api.instagram.com/oauth/access_token
    /// </summary>
    public async Task<InstagramShortLivedTokenResponse> GetShortLivedAccessTokenAsync(string code, CancellationToken cancellationToken = default)
    {
        var instOptions = options.Value;
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = instOptions.AppId,
            ["client_secret"] = instOptions.AppSecret,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = instOptions.RedirectUri,
            ["code"] = code
        });

        var response = await httpClient.PostAsync("https://api.instagram.com/oauth/access_token", body, cancellationToken);
        var content = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new InstagramException($"Failed to get short-lived token: {content}");

        var parsed = System.Text.Json.JsonSerializer.Deserialize<InstagramShortLivedTokenResponse>(content)
            ?? throw new InstagramException("Failed to deserialize short-lived token response");

        return parsed ?? throw new InstagramException("Short-lived token response contained no data");
    }

    /// <summary>
    /// Instagram Login API: exchanges short-lived token for long-lived token (60 days).
    /// GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&...
    /// </summary>
    public async Task<FacebookTokenResponse> GetLongLivedAccessTokenAsync(string shortLivedToken, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForLongLivedTokenExchange(shortLivedToken);

        var response = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(url, cancellationToken)
            ?? throw new InstagramException("Failed to get long-lived token");

        return response;
    }

    /// <summary>
    /// Get Instagram user info (user_id, username, profile_picture_url).
    /// GET https://graph.instagram.com/v22.0/me?fields=...
    /// </summary>
    public async Task<InstagramUserInfo> GetInstagramUserAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForUserInfo(accessToken, ["id", "username", "profile_picture_url"]);

        var response = await httpClient.GetFromJsonAsync<InstagramUserInfo>(url, cancellationToken)
            ?? throw new InstagramException("Failed to get Instagram user info");

        return response;
    }

    public async Task<FacebookTokenResponse> RefreshLongLivedTokenAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForTokenRefresh(accessToken);

        var response = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(url, cancellationToken)
            ?? throw new InstagramException("Failed to refresh long-lived token");

        return response;
    }

    private async Task<InstagramApiResponse> HandleInstagramResponseAsync(HttpResponseMessage response)
    {
        var responseContent = await response.Content.ReadAsStringAsync();
        try
        {
            var instagramResponse = JsonConvert.DeserializeObject<InstagramApiResponse>(responseContent) ??
                throw new InstagramException("Couldn't unparse response");

            if (!response.IsSuccessStatusCode)
                logger.LogError("Instagram API returned error. Status code: {StatusCode}, Response: {ResponseContent}", response.StatusCode, responseContent);

            return instagramResponse;
        }
        catch (JsonReaderException ex)
        {
            logger.LogError(ex, "Error occurred while parsing Instagram API response");
            throw new InstagramException(ex.Message);
        }
    }
}
