using System.Text;
using Flurl;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Models.TikTok;

namespace Publisher.Infrastructure.Clients.TikTok;

internal class TikTokConnectionService(
    IOptions<TikTokApiOptions> tikTokOptions,
    HttpClient httpClient,
    IApplicationDbContext dbContext,
    ILogger<TikTokConnectionService> logger)
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

    public async Task<bool> ConnectAccountAsync(
        string code,
        ConnectionState state,
        CancellationToken cancellationToken)
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

        var tokenResponse = JsonConvert.DeserializeObject<TikTokTokenResponse>(content);

        if (tokenResponse == null)
        {
            throw new Exception("Failed to deserialize TikTok token response.");
        }

        var credentials = new TikTokCredentials
        {
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            OpenId = tokenResponse.OpenId
        };

        var projectId = state.ProjectId;
        var socialAccount = new SocialAccount
        {
            ProjectId = projectId,
            Username = $"TikTokUser_{tokenResponse.OpenId}",
            Provider = SocialProvider.TikTok,
            TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn),
            Credentials = JsonConvert.SerializeObject(credentials)
        };

        dbContext.SocialAccounts.Add(socialAccount);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Successfully connected TikTok account with OpenID {OpenId} for project {ProjectId}",
            tokenResponse.OpenId, projectId);
        return true;
    }
}