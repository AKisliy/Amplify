using System.Net.Http.Json;
using System.Text;
using Flurl;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Instagram;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Models.Facebook;
using Publisher.Infrastructure.Models.Integration;

namespace Publisher.Infrastructure.Clients.Instagram;

public class InstagramIntegrationService(
    IOptions<InstagramApiOptions> instOptions,
    HttpClient httpClient,
    IApplicationDbContext dbContext,
    ILogger<InstagramIntegrationService> logger)
    : IInstagramIntegrationService
{
    private readonly IReadOnlyList<string> _scopesForPublishing = [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "ads_management",
        "business_management"
    ];

    public async Task<bool> ConnectInstagramAccountAsync(
        string code,
        Guid projectId,
        CancellationToken cancellationToken)
    {
        // TODO: all API-calls should be in InstagramApiClient --- IGNORE ---
        var clientId = instOptions.Value.AppId;
        var clientSecret = instOptions.Value.AppSecret;
        var redirectUri = instOptions.Value.RedirectUri;

        // 1: Get Short-Lived User Access Token
        var shortTokenResponse = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(
            $"https://graph.facebook.com/v18.0/oauth/access_token?client_id={clientId}&redirect_uri={redirectUri}&client_secret={clientSecret}&code={code}",
            cancellationToken);

        if (shortTokenResponse?.AccessToken == null)
            throw new Exception("Failed to get short-lived token");

        // 2: Exchange for Long-Lived User Access Token
        var longTokenResponse = await httpClient.GetFromJsonAsync<FacebookTokenResponse>(
            $"https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={clientId}&client_secret={clientSecret}&fb_exchange_token={shortTokenResponse.AccessToken}",
            cancellationToken);

        if (longTokenResponse?.AccessToken == null)
            throw new Exception("Failed to get long-lived token");

        var finalToken = longTokenResponse.AccessToken;

        // 3: Get User's Facebook Pages and linked Instagram Business Accounts
        var accountsResponse = await httpClient.GetFromJsonAsync<FacebookAccountsResponse>(
            $"https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{{id,username}},name&access_token={finalToken}",
            cancellationToken: cancellationToken);

        var targetPage = accountsResponse?.Data
            .FirstOrDefault(p => p.InstagramBusinessAccount != null);

        if (targetPage == null)
            throw new Exception("No Instagram Business account connected to user's Facebook pages.");

        logger.LogInformation("Successfully connected Instagram Business Account {InstagramUsername} with ID {InstagramId}",
            targetPage.InstagramBusinessAccount?.Username,
            targetPage.InstagramBusinessAccount?.Id);

        logger.LogInformation("Long-Lived User Access Token: {AccessToken}", finalToken);

        var socialAccount = new SocialAccount
        {
            ProjectId = projectId,
            Username = targetPage.InstagramBusinessAccount?.Username ?? "Unknown",
            Provider = SocialProvider.Instagram,
            TokenExpiresAt = DateTime.UtcNow.AddSeconds(
                longTokenResponse.ExpiresIn > 0 ? longTokenResponse.ExpiresIn : 60 * 60 * 24 * 60)
        };

        var instagramCredentials = new InstagramCredentials
        {
            InstagramBusinessAccountId = targetPage.InstagramBusinessAccount!.Id,
            InstagramUsername = targetPage.InstagramBusinessAccount.Username,
            FacebookPageId = targetPage.Id,
            AccessToken = finalToken,
        };

        var instagramCreds = JsonConvert.SerializeObject(instagramCredentials);

        socialAccount.Credentials = instagramCreds;

        dbContext.SocialAccounts.Add(socialAccount);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public Task<InstagramAuthUrl> GetAuthUrlAsync(Guid projectId, CancellationToken cancellationToken)
    {
        var appId = instOptions.Value.AppId;
        var redirectUri = instOptions.Value.RedirectUri;
        var scope = string.Join(',', _scopesForPublishing);

        var state = new IntegrationState(projectId);
        var stateBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(state));
        var encodedState = Convert.ToBase64String(stateBytes);

        var url = new Url("https://www.facebook.com/v18.0/dialog/oauth");
        url.AppendQueryParam("client_id", appId)
            .AppendQueryParam("redirect_uri", redirectUri)
            .AppendQueryParam("scope", scope)
            .AppendQueryParam("response_type", "code")
            .AppendQueryParam("state", encodedState);

        return Task.FromResult(new InstagramAuthUrl(url));
    }
}
