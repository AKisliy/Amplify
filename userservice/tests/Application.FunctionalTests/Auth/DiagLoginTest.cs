using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace UserService.Application.FunctionalTests.Auth;

using static Testing;

[TestFixture]
public class DiagLoginTest : BaseTestFixture
{
    [Test]
    public async Task Diag_CheckEmailConfirmedAndPassword()
    {
        var (userId, email, password) = await CreateConfirmedUserAsync("diag@test.com");

        using var scope = GetScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var signInManager = scope.ServiceProvider.GetRequiredService<SignInManager<ApplicationUser>>();

        var user = await userManager.FindByEmailAsync(email);
        user.ShouldNotBeNull("User not found in DB");
        user!.EmailConfirmed.ShouldBeTrue("EmailConfirmed should be true");

        var passwordOk = await userManager.CheckPasswordAsync(user, password);

        passwordOk.ShouldBeTrue("Password check failed via UserManager");

        var signInResult = await signInManager.CheckPasswordSignInAsync(user, password, false);
        signInResult.ShouldNotBeNull();
        signInResult.Succeeded.ShouldBeTrue();
    }
}
