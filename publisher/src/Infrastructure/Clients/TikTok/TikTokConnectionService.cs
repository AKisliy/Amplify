using System.Text;
using System.Transactions;
using Ardalis.GuardClauses;
using FluentValidation;
using Flurl;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Application.Common.Options;
using Publisher.Application.Connections.Commands;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Models.TikTok;
using Publisher.Infrastructure.Scheduler.BackgroundJobs;

namespace Publisher.Infrastructure.Clients.TikTok;

internal class TikTokConnectionService(
    IOptions<TikTokApiOptions> tikTokOptions,
    IApplicationDbContext dbContext,
    ILogger<TikTokConnectionService> logger,
    IOptions<FrontendOptions> frontendOptions,
    IBackgroundJobClient backgroundJobClient,
    TikTokApiClient apiClient)
    : IConnectionService
{
    private readonly IReadOnlyList<string> _scopes = [
        "user.info.basic",
        "video.publish"
    ];

    public SocialProvider SocialProvider => SocialProvider.TikTok;

    public Task<AuthUrlResponse> GetAuthUrlAsync(Guid projectId, CancellationToken cancellationToken)
    {
        var state = new ConnectionState(projectId, SocialProvider.TikTok);
        var stateBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(state));
        var encodedState = Convert.ToBase64String(stateBytes);

        var clientKey = tikTokOptions.Value.ClientKey;
        var redirectUri = tikTokOptions.Value.RedirectUri;
        var scope = string.Join(',', _scopes);


        var url = new Url("https://www.tiktok.com/v2/auth/authorize/")
            .SetQueryParam("client_key", clientKey)
            .SetQueryParam("redirect_uri", redirectUri)
            .SetQueryParam("scope", scope)
            .SetQueryParam("response_type", "code")
            .SetQueryParam("state", encodedState);

        return Task.FromResult(new AuthUrlResponse(url));
    }

    public async Task<ConnectionResult> ConnectAccountAsync(
        string code,
        ConnectionState state,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Starting TikTok account connection process for project {ProjectId}", state.ProjectId);

        var tokenResponse = await apiClient.ExchangeCodeForTokenAsync(code, cancellationToken);

        Guard.Against.Null(tokenResponse.AccessToken);
        Guard.Against.Null(tokenResponse.RefreshToken);

        var user = await apiClient.GetTikTokUserAsync(tokenResponse.AccessToken, cancellationToken);

        var credentials = new TikTokCredentials
        {
            AccessToken = tokenResponse.AccessToken!,
            RefreshToken = tokenResponse.RefreshToken!,
            OpenId = tokenResponse.OpenId!
        };

        var serializedCredentials = JsonConvert.SerializeObject(credentials);
        var providerUserId = tokenResponse.OpenId!;
        var projectId = state.ProjectId;

        var socialAccount = await dbContext.SocialAccounts
            .Include(sa => sa.Projects)
            .FirstOrDefaultAsync(sa => sa.Provider == SocialProvider.TikTok && sa.ProviderUserId == providerUserId, cancellationToken);

        if (socialAccount is null)
        {
            socialAccount = new SocialAccount
            {
                ProviderUserId = providerUserId,
                Username = user.DisplayName ?? "TikTok",
                Provider = SocialProvider.TikTok,
            };
            dbContext.SocialAccounts.Add(socialAccount);
        }
        else
        {
            socialAccount.Username = user.DisplayName ?? socialAccount.Username;
        }

        socialAccount.Credentials = serializedCredentials;
        socialAccount.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);

        if (!socialAccount.Projects.Any(p => p.Id == projectId))
        {
            var project = await dbContext.Projects.FindAsync([projectId], cancellationToken);
            Guard.Against.NotFound(projectId, project);
            socialAccount.Projects.Add(project);
        }

        using var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled);
        {
            await dbContext.SaveChangesAsync(cancellationToken);

            if (!string.IsNullOrEmpty(user.AvatarUrl))
                backgroundJobClient.Enqueue<ImportAvatarJob>(j => j.ImportAsync(socialAccount.Id, user.AvatarUrl, CancellationToken.None));

            transaction.Complete();
        }

        logger.LogInformation(
            "Successfully connected TikTok account with OpenID {OpenId} for project {ProjectId}",
            providerUserId,
            projectId);

        var result = new ConnectionResult(socialAccount.Id, frontendOptions.Value.ConnectionsPath);
        return result;
    }

    public async Task RefreshAccessTokenAsync(SocialAccount account, CancellationToken cancellationToken = default)
    {
        var credentials = JsonConvert.DeserializeObject<TikTokCredentials>(account.Credentials)
            ?? throw new InvalidOperationException($"Cannot deserialize TikTok credentials for account {account.Id}");

        var tokenResponse = await apiClient.RefreshTokenAsync(credentials.RefreshToken, cancellationToken);

        credentials.AccessToken = tokenResponse.AccessToken!;
        credentials.RefreshToken = tokenResponse.RefreshToken!;
        account.Credentials = JsonConvert.SerializeObject(credentials);
        account.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Refreshed TikTok token for account {AccountId}, new expiry: {ExpiresAt}",
            account.Id, account.TokenExpiresAt);
    }
}