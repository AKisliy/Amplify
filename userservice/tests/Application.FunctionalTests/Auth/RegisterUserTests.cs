using UserService.Application.Auth.Register;
using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace UserService.Application.FunctionalTests.Auth;

using static Testing;

[TestFixture]
public class RegisterUserTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRegisterUser()
    {
        var userId = await SendAsync(new RegisterUserCommand("newuser@test.com", "Password123!"));

        userId.ShouldNotBe(Guid.Empty);
    }

    [Test]
    public async Task ShouldCreateUserInDatabase()
    {
        await SendAsync(new RegisterUserCommand("dbcheck@test.com", "Password123!"));

        using var scope = GetScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync("dbcheck@test.com");

        user.ShouldNotBeNull();
        user.Email.ShouldBe("dbcheck@test.com");
    }

    [Test]
    public async Task ShouldRegisterUserWithUnconfirmedEmail()
    {
        await SendAsync(new RegisterUserCommand("unconfirmed@test.com", "Password123!"));

        using var scope = GetScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync("unconfirmed@test.com");

        user.ShouldNotBeNull();
        user.EmailConfirmed.ShouldBeFalse();
    }

    [Test]
    public async Task ShouldFailForDuplicateEmail()
    {
        await SendAsync(new RegisterUserCommand("duplicate@test.com", "Password123!"));

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new RegisterUserCommand("duplicate@test.com", "Password123!")));
    }
}
