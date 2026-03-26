namespace UserService.Application.FunctionalTests.Auth;

using UserService.Application.Auth.Login;
using static Testing;

[TestFixture]
public class Login : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidCredentials()
    {
        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new LoginUserCommand("", "")));
    }

    [Test]
    public async Task ShouldLoginSuccessfully()
    {
        var (_, login, password) = await CreateConfirmedUserAsync("test@local");

        var response = await SendAsync(new LoginUserCommand(login, password));

        response.AccessToken.ShouldNotBeNullOrEmpty();
        response.RefreshToken.ShouldNotBeNullOrEmpty();
    }
}
