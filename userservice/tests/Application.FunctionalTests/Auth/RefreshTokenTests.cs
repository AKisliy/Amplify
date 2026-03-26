using UserService.Application.Auth.Login;
using UserService.Application.Auth.Refresh;

namespace UserService.Application.FunctionalTests.Auth;

using static Testing;

[TestFixture]
public class RefreshTokenTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRefreshTokens()
    {
        var (_, email, password) = await CreateConfirmedUserAsync();
        var loginResponse = await SendAsync(new LoginUserCommand(email, password));

        var refreshResponse = await SendAsync(
            new RefreshTokenCommand(loginResponse.AccessToken, loginResponse.RefreshToken));

        refreshResponse.ShouldNotBeNull();
        refreshResponse.AccessToken.ShouldNotBeNullOrEmpty();
        refreshResponse.RefreshToken.ShouldNotBeNullOrEmpty();
    }

    [Test]
    public async Task ShouldIssueNewTokensOnRefresh()
    {
        var (_, email, password) = await CreateConfirmedUserAsync();
        var loginResponse = await SendAsync(new LoginUserCommand(email, password));

        var refreshResponse = await SendAsync(
            new RefreshTokenCommand(loginResponse.AccessToken, loginResponse.RefreshToken));

        refreshResponse.RefreshToken.ShouldNotBe(loginResponse.RefreshToken);
    }

    [Test]
    public async Task ShouldFailWithInvalidRefreshToken()
    {
        var (_, email, password) = await CreateConfirmedUserAsync();
        var loginResponse = await SendAsync(new LoginUserCommand(email, password));

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new RefreshTokenCommand(loginResponse.AccessToken, "invalid-refresh-token")));
    }

    [Test]
    public async Task ShouldFailWithInvalidAccessToken()
    {
        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new RefreshTokenCommand("invalid-access-token", "any-refresh-token")));
    }
}
