using System.Text;
using Flurl;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Configuration.Options;

namespace Publisher.Infrastructure.Clients.Instagram;

internal class InstagramConnectionService(
    IOptions<InstagramApiOptions> instOptions,
    InstagramApiClient instagramApiClient,
    IApplicationDbContext dbContext,
    ILogger<InstagramConnectionService> logger)
    : IConnectionService
{
    private const int DefaultExpirationDays = 60;
    private readonly IReadOnlyList<string> _scopesForPublishing = [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "ads_management",
        "business_management"
    ];

    public SocialProvider SocialProvider => SocialProvider.Instagram;

    public async Task<bool> ConnectAccountAsync(
        string code,
        ConnectionState state,
        CancellationToken cancellationToken)
    {
        var shortLivedTokenResponse = await instagramApiClient.GetShortLivedAccessTokenAsync(code, cancellationToken);

        var longLivedTokenResponse = await instagramApiClient.GetLongLivedAccessTokenAsync(
            shortLivedTokenResponse.AccessToken,
            cancellationToken);

        var accountsResponse = await instagramApiClient.GetFacebookAccountsAsync(
            longLivedTokenResponse.AccessToken,
            cancellationToken);

        var targetPage = accountsResponse?.Data.FirstOrDefault(p => p.InstagramBusinessAccount != null)
            ?? throw new Exception("No Instagram Business account connected to user's Facebook pages.");

        logger.LogInformation("Successfully connected Instagram Business Account {InstagramUsername} with ID {InstagramId}",
            targetPage.InstagramBusinessAccount?.Username,
            targetPage.InstagramBusinessAccount?.Id);

        logger.LogInformation("Long-Lived User Access Token: {AccessToken}", longLivedTokenResponse);

        var tokenExpiresAt = DateTime.UtcNow.AddSeconds(
            longLivedTokenResponse.ExpiresIn > 0 ?
            longLivedTokenResponse.ExpiresIn :
            60 * 60 * 24 * DefaultExpirationDays);

        var socialAccount = new SocialAccount
        {
            ProjectId = state.ProjectId,
            Username = targetPage.InstagramBusinessAccount?.Username ?? "Unknown",
            Provider = SocialProvider.Instagram,
            TokenExpiresAt = tokenExpiresAt
        };

        var instagramCredentials = new InstagramCredentials
        {
            InstagramBusinessAccountId = targetPage.InstagramBusinessAccount!.Id,
            InstagramUsername = targetPage.InstagramBusinessAccount.Username,
            FacebookPageId = targetPage.Id,
            AccessToken = longLivedTokenResponse.AccessToken,
        };

        var instagramCreds = JsonConvert.SerializeObject(instagramCredentials);

        socialAccount.Credentials = instagramCreds;

        dbContext.SocialAccounts.Add(socialAccount);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public Task<AuthUrlResponse> GetAuthUrlAsync(Guid projectId, CancellationToken cancellationToken)
    {
        var appId = instOptions.Value.AppId;
        var redirectUri = instOptions.Value.RedirectUri;
        var scope = string.Join(',', _scopesForPublishing);

        var state = new ConnectionState(projectId, SocialProvider.Instagram);
        var stateBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(state));
        var encodedState = WebEncoders.Base64UrlEncode(stateBytes);

        var url = new Url("https://www.facebook.com/v18.0/dialog/oauth")
            .SetQueryParam("client_id", appId)
            .SetQueryParam("redirect_uri", redirectUri)
            .SetQueryParam("scope", scope)
            .SetQueryParam("response_type", "code")
            .SetQueryParam("state", encodedState);

        return Task.FromResult(new AuthUrlResponse(url));
    }
}
