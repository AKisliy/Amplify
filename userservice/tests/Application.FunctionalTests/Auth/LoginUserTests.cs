using UserService.Application.Auth.Login;

namespace UserService.Application.FunctionalTests.Auth;

using static Testing;

[TestFixture]
public class LoginUserTests : BaseTestFixture
{
    [Test]
    public async Task ShouldLoginWithValidCredentials()
    {
        var (_, email, password) = await CreateConfirmedUserAsync();

        var response = await SendAsync(new LoginUserCommand(email, password));

        response.ShouldNotBeNull();
        response.AccessToken.ShouldNotBeNullOrEmpty();
        response.RefreshToken.ShouldNotBeNullOrEmpty();
    }

    [Test]
    public async Task ShouldFailWithWrongPassword()
    {
        var (_, email, _) = await CreateConfirmedUserAsync();

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new LoginUserCommand(email, "WrongPassword999!")));
    }

    [Test]
    public async Task ShouldFailForNonExistentEmail()
    {
        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new LoginUserCommand("nobody@test.com", "Password123!")));
    }

    [Test]
    public async Task ShouldFailForUnconfirmedEmail()
    {
        // Register without email confirmation (unlike CreateConfirmedUserAsync)
        await RunAsDefaultUserAsync("unconfirmed@test.com", "Testing1234!");

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new LoginUserCommand("unconfirmed@test.com", "Testing1234!")));
    }

    [Test]
    public async Task ShouldReturnDifferentTokensForDifferentLogins()
    {
        var (_, email, password) = await CreateConfirmedUserAsync();

        var first = await SendAsync(new LoginUserCommand(email, password));
        var second = await SendAsync(new LoginUserCommand(email, password));

        // Each login generates a new refresh token
        first.RefreshToken.ShouldNotBe(second.RefreshToken);
    }
}
