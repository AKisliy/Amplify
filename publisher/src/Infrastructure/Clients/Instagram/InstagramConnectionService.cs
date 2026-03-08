using System.Text;
using Hangfire;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Application.Connections.Commands;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Application.Common.Options;
using Publisher.Infrastructure.Scheduler.BackgroundJobs;

namespace Publisher.Infrastructure.Clients.Instagram;

internal class InstagramConnectionService(
    InstagramUrlBuilder urlBuilder,
    InstagramApiClient instagramApiClient,
    IApplicationDbContext dbContext,
    IOptions<FrontendOptions> frontendOptions,
    IBackgroundJobClient backgroundJobClient,
    ILogger<InstagramConnectionService> logger)
    : IConnectionService
{
    private const int DefaultExpirationDays = 60;

    // Instagram Business Login API scopes
    private readonly IReadOnlyList<string> _scopesForPublishing = [
        "instagram_business_basic",
        "instagram_business_content_publish"
    ];

    public SocialProvider SocialProvider => SocialProvider.Instagram;

    public async Task<ConnectionResult> ConnectAccountAsync(
        string code,
        ConnectionState state,
        CancellationToken cancellationToken)
    {
        var shortLivedToken = await instagramApiClient.GetShortLivedAccessTokenAsync(code, cancellationToken);
        var instagramUserId = shortLivedToken.UserId;

        var longLivedToken = await instagramApiClient.GetLongLivedAccessTokenAsync(
            shortLivedToken.AccessToken,
            cancellationToken);

        var userInfo = await instagramApiClient.GetInstagramUserAsync(longLivedToken.AccessToken, cancellationToken);

        logger.LogInformation("Instagram Business Login: connected user {Username} ({UserId})", userInfo.Username, instagramUserId);

        var tokenExpiresAt = DateTime.UtcNow.AddSeconds(
            longLivedToken.ExpiresIn > 0
                ? longLivedToken.ExpiresIn
                : 60 * 60 * 24 * DefaultExpirationDays);

        var stringId = instagramUserId.ToString();

        var instagramCredentials = new InstagramCredentials
        {
            InstagramUserId = stringId,
            InstagramUsername = userInfo.Username,
            AccessToken = longLivedToken.AccessToken,
        };

        var serializedCredentials = JsonConvert.SerializeObject(instagramCredentials);

        var socialAccount = await dbContext.SocialAccounts
            .Include(sa => sa.Projects)
            .FirstOrDefaultAsync(
                sa => sa.Provider == SocialProvider.Instagram && sa.ProviderUserId == stringId,
                cancellationToken);

        if (socialAccount is null)
        {
            socialAccount = new SocialAccount
            {
                ProviderUserId = stringId,
                Username = userInfo.Username,
                Provider = SocialProvider.Instagram,
            };
            dbContext.SocialAccounts.Add(socialAccount);
        }
        else
        {
            socialAccount.Username = userInfo.Username;
        }

        socialAccount.Credentials = serializedCredentials;
        socialAccount.TokenExpiresAt = tokenExpiresAt;

        if (!socialAccount.Projects.Any(p => p.Id == state.ProjectId))
        {
            var project = await dbContext.Projects.FindAsync([state.ProjectId], cancellationToken);
            Guard.Against.NotFound(state.ProjectId, project);
            socialAccount.Projects.Add(project);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrEmpty(userInfo.ProfilePictureUrl))
            backgroundJobClient.Enqueue<ImportAvatarJob>(j =>
                j.ImportAsync(socialAccount.Id, userInfo.ProfilePictureUrl, CancellationToken.None));

        return new ConnectionResult(socialAccount.Id, frontendOptions.Value.ConnectionsPath);
    }

    public Task<AuthUrlResponse> GetAuthUrlAsync(Guid projectId, CancellationToken cancellationToken)
    {
        var state = new ConnectionState(projectId, SocialProvider.Instagram);
        var stateBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(state));
        var encodedState = WebEncoders.Base64UrlEncode(stateBytes);

        var url = urlBuilder.GetUrlForLogin(_scopesForPublishing, encodedState);

        return Task.FromResult(new AuthUrlResponse(url));
    }

    public async Task RefreshAccessTokenAsync(SocialAccount account, CancellationToken cancellationToken = default)
    {
        var credentials = JsonConvert.DeserializeObject<InstagramCredentials>(account.Credentials)
            ?? throw new InvalidOperationException($"Cannot deserialize Instagram credentials for account {account.Id}");

        var tokenResponse = await instagramApiClient.RefreshLongLivedTokenAsync(credentials.AccessToken, cancellationToken);

        credentials.AccessToken = tokenResponse.AccessToken;
        account.Credentials = JsonConvert.SerializeObject(credentials);
        account.TokenExpiresAt = DateTime.UtcNow.AddSeconds(
            tokenResponse.ExpiresIn > 0 ? tokenResponse.ExpiresIn : 60 * 60 * 24 * DefaultExpirationDays);

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Refreshed Instagram token for account {AccountId}, new expiry: {ExpiresAt}",
            account.Id, account.TokenExpiresAt);
    }
}
