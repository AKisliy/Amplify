using System.Net.Http.Json;
using Newtonsoft.Json;
using Polly.Registry;
using Publisher.Domain.Entities;
using Publisher.Infrastructure.Constants;
using Publisher.Infrastructure.Models.Exceptions;
using Publisher.Infrastructure.Models.Facebook;
using Publisher.Infrastructure.Models.Instagram;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramApiClient(
    HttpClient httpClient,
    InstagramUrlBuilder urlBuilder,
    InstagramPayloadBuilder payloadBuilder,
    InstagramHeaderBuilder headerBuilder,
    ResiliencePipelineProvider<string> pipelineProvider)
{
    public async Task<InstagramApiResponse> CreateReelContainerAsync(InstagramReelData reelData, InstagramCredentials credentials)
    {
        var creationUrl = urlBuilder.GetMediaCreationUrl(credentials.InstagramBusinessAccountId);
        var creationPayload = payloadBuilder.BuildReelCreationPayload(reelData, credentials);
        var creationResponse = await httpClient.PostAsync(creationUrl, creationPayload);
        return await HandleInstagramResponseAsync(creationResponse);
    }

    public async Task<string> GetPostLink(string instagramMediaId, string accessToken)
    {
        var url = urlBuilder.GetUrlForShortcode(instagramMediaId, accessToken);
        var request = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await httpClient.SendAsync(request);
        var transformedRespose = await HandleInstagramResponseAsync(response);
        if (transformedRespose.ShortCode == null)
            throw new InstagramException("Instagram returned empty shortcode", transformedRespose.Error ?? new());
        return urlBuilder.FormPostLink(transformedRespose.ShortCode);
    }

    public async Task<InstagramApiResponse> UploadVideoToContainerAsync(string videoPath, string accessToken, string creationId)
    {
        var uploadRequest = await GetUploadRequestMessageAsync(videoPath, accessToken, creationId);

        var uploadResponse = await httpClient.SendAsync(uploadRequest);
        return await HandleInstagramResponseAsync(uploadResponse);
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
        var userId = credentials.InstagramBusinessAccountId;
        var accessToken = credentials.AccessToken;

        var publishUrl = urlBuilder.GetPublishUrl(userId);
        var publishPayload = payloadBuilder.BuildPublishPayload(creationId, accessToken);
        var apiResponse = await httpClient.PostAsync(publishUrl, publishPayload);

        var proccessedResponse = await HandleInstagramResponseAsync(apiResponse);
        return proccessedResponse;
    }

    public async Task<FacebookTokenResponse> GetShortLivedAccessTokenAsync(string code, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForShortLivedToken(code);

        var response = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(url, cancellationToken) ??
            throw new InstagramException("Failed to get short-lived token");
        return response;
    }

    public async Task<FacebookTokenResponse> GetLongLivedAccessTokenAsync(string shortLivedAccessToken, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForLongLivedToken(shortLivedAccessToken);

        var response = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(url, cancellationToken) ??
            throw new InstagramException("Failed to get long-lived token");

        return response;
    }

    public async Task<FacebookAccountsResponse> GetFacebookAccountsAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        var url = urlBuilder.GetUrlForFacebookAccounts(accessToken);

        var accountsResponse = await httpClient.GetFromJsonAsync<FacebookAccountsResponse>(
            url,
            cancellationToken);

        if (accountsResponse == null)
            throw new InstagramException("Failed to get facebook accounts");

        return accountsResponse;
    }

    private async Task<HttpRequestMessage> GetUploadRequestMessageAsync(string videoPath, string accessToken, string creationId)
    {
        // var uploadUrl = urlBuilder.GetMediaResumableUploadUrl(creationId);

        // var fileStream = fileStorage.OpenFile(videoPath);

        // var uploadRequest = new HttpRequestMessage(HttpMethod.Post, uploadUrl)
        // {
        //     Content = new StreamContent(fileStream)
        // };

        // headerBuilder.AddResumableUploadHeaders(uploadRequest, accessToken, fileSize);

        // return uploadRequest;
        throw new NotImplementedException();
    }

    private async Task<InstagramApiResponse> HandleInstagramResponseAsync(HttpResponseMessage response)
    {
        var responseContent = await response.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<InstagramApiResponse>(responseContent) ??
                throw new InstagramException("Couldn't unparse response");
        }
        catch (JsonReaderException ex)
        {
            throw new InstagramException(ex.Message);
        }
    }
}
