using UserService.Application.Auth.Login;
using UserService.Application.Auth.Logout;
using UserService.Application.Auth.Refresh;

namespace UserService.Application.FunctionalTests.Auth;

using static Testing;

[TestFixture]
public class LogoutTests : BaseTestFixture
{
    [Test]
    public async Task ShouldLogoutSuccessfully()
    {
        // RunAsDefaultUserAsync sets IUser mock to the created user
        await RunAsDefaultUserAsync();

        await Should.NotThrowAsync(async () =>
            await SendAsync(new LogoutCommand()));
    }

    [Test]
    public async Task ShouldInvalidateRefreshTokenAfterLogout()
    {
        // Create a confirmed user and get their tokens
        var (userId, email, password) = await CreateConfirmedUserAsync("logout@test.com");
        var loginResponse = await SendAsync(new LoginUserCommand(email, password));

        // Point the IUser mock at this user so LogoutCommand sees the right userId
        SetCurrentUser(userId);

        await SendAsync(new LogoutCommand());

        // After logout, the refresh token must no longer be valid
        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new RefreshTokenCommand(loginResponse.AccessToken, loginResponse.RefreshToken)));
    }
}
