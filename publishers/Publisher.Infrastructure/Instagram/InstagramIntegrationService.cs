using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Publisher.Application.Common.Interfaces.Instagram;
using Publisher.Application.Common.Models.Facebook;
using Publisher.Application.Integrations.Queries;
using Publisher.Core.Entities;
using Publisher.Infrastructure.Configuration;
using Publisher.Infrastructure.Data;

namespace Publisher.Infrastructure.Instagram;

public class InstagramIntegrationService(
    IOptions<InstagramApiOptions> instOptions,
    HttpClient httpClient,
    PublisherDbContext dbContext,
    ILogger<InstagramIntegrationService> logger)
    : IInstagramIntegrationService
{
    public async Task<bool> ConnectInstagramAccountAsync(string code)
    {
        var clientId = instOptions.Value.AppId;
        var clientSecret = instOptions.Value.AppSecret;
        var redirectUri = instOptions.Value.RedirectUri;

        // 1: Get Short-Lived User Access Token
        var shortTokenResponse = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(
            $"https://graph.facebook.com/v18.0/oauth/access_token?client_id={clientId}&redirect_uri={redirectUri}&client_secret={clientSecret}&code={code}");

        if (shortTokenResponse?.AccessToken == null)
            throw new Exception("Failed to get short-lived token");

        // 2: Exchange for Long-Lived User Access Token
        var longTokenResponse = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(
            $"https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={clientId}&client_secret={clientSecret}&fb_exchange_token={shortTokenResponse.AccessToken}");

        if (longTokenResponse?.AccessToken == null)
            throw new Exception("Failed to get long-lived token");

        var finalToken = longTokenResponse.AccessToken;

        // 3: Get User's Facebook Pages and linked Instagram Business Accounts
        var accountsResponse = await httpClient.GetFromJsonAsync<FacebookAccountsResponse>(
            $"https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{{id,username}},name&access_token={finalToken}");

        var targetPage = accountsResponse?.Data
            .FirstOrDefault(p => p.InstagramBusinessAccount != null);

        if (targetPage == null)
            throw new Exception("No Instagram Business account connected to user's Facebook pages.");

        // TODO:Here you would typically save the finalToken and InstagramBusinessAccount info to your database
        logger.LogInformation("Successfully connected Instagram Business Account {InstagramUsername} with ID {InstagramId}",
            targetPage.InstagramBusinessAccount?.Username,
            targetPage.InstagramBusinessAccount?.Id);

        logger.LogInformation("Long-Lived User Access Token: {AccessToken}", finalToken);

        var instagramConnection = new InstagramConnection
        {
            InstagramBusinessAccountId = targetPage.InstagramBusinessAccount!.Id,
            InstagramUsername = targetPage.InstagramBusinessAccount.Username,
            FacebookPageId = targetPage.Id,
            AccessToken = finalToken,
            ConnectedAt = DateTime.UtcNow,
            TokenExpiresAt = DateTime.UtcNow.AddSeconds(longTokenResponse.ExpiresIn > 0 ? longTokenResponse.ExpiresIn : 60 * 60 * 24 * 60) // Default to 60 days if expires_in not provided
        };

        dbContext.InstagramConnections.Add(instagramConnection);
        await dbContext.SaveChangesAsync();

        return true;
    }

    public Task<InstargramAuthUrl> GetAuthUrlAsync()
    {
        var appId = instOptions.Value.AppId;
        var redirectUri = instOptions.Value.RedirectUri;
        var scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,ads_management,business_management";

        var url = $"https://www.facebook.com/v18.0/dialog/oauth?client_id={appId}&redirect_uri={redirectUri}&scope={scope}&response_type=code";

        return Task.FromResult(new InstargramAuthUrl(url));
    }
}
