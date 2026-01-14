using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using UserService.Application.Common.Exceptions;

namespace UserService.Infrastructure.Identity;

public class IdentityService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IUserClaimsPrincipalFactory<ApplicationUser> userClaimsPrincipalFactory,
    IAuthorizationService authorizationService) : IIdentityService
{
    public async Task<string?> GetUserNameAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        return user?.UserName;
    }

    public async Task<(Result Result, Guid UserId)> CreateUserAsync(string userName, string password)
    {
        var user = new ApplicationUser
        {
            UserName = userName,
            Email = userName,
        };

        var result = await userManager.CreateAsync(user, password);

        return (result.ToApplicationResult(), user.Id);
    }

    public async Task<bool> IsInRoleAsync(Guid userId, string role)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        return user != null && await userManager.IsInRoleAsync(user, role);
    }

    public async Task<bool> AuthorizeAsync(Guid userId, string policyName)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        if (user == null)
        {
            return false;
        }

        var principal = await userClaimsPrincipalFactory.CreateAsync(user);

        var result = await authorizationService.AuthorizeAsync(principal, policyName);

        return result.Succeeded;
    }

    public async Task<Result> DeleteUserAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        return user != null ? await DeleteUserAsync(user) : Result.Success();
    }

    public async Task<Result> DeleteUserAsync(ApplicationUser user)
    {
        var result = await userManager.DeleteAsync(user);

        return result.ToApplicationResult();
    }

    public async Task<string> GenerateEmailConfirmationTokenAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString()) ?? throw new Exception("User not found");

        return await userManager.GenerateEmailConfirmationTokenAsync(user);
    }

    public async Task ConfirmUserEmail(Guid userId, string code)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return;

        var result = await userManager.ConfirmEmailAsync(user, code);

        if (!result.Succeeded) throw new Exception();
    }

    public async Task<(Guid UserId, string Email, IList<string> Roles)> AuthenticateAsync(string email, string password)
    {
        var user = await userManager.FindByEmailAsync(email) ?? throw new UnauthorizedAccessException();

        var result = await signInManager.CheckPasswordSignInAsync(user, password, false);
        if (!result.Succeeded) throw new UnauthorizedAccessException();

        var roles = await userManager.GetRolesAsync(user);

        return (user.Id, user.Email!, roles);
    }

    public async Task<(Result Result, Guid UserId, string Email, IList<string> Roles)> ValidateRefreshTokenAsync(Guid userId, string refreshToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());

        if (user == null)
        {
            return (Result.Failure(["User not found"]), Guid.Empty, string.Empty, new List<string>());
        }

        var storedValue = await userManager.GetAuthenticationTokenAsync(user, "Default", "RefreshToken");

        if (string.IsNullOrEmpty(storedValue))
        {
            return (Result.Failure(["Invalid refresh token"]), Guid.Empty, string.Empty, new List<string>());
        }

        var parts = storedValue.Split(';');
        if (parts.Length != 2)
        {
            return (Result.Failure(["Corrupted token data"]), Guid.Empty, string.Empty, new List<string>());
        }

        var storedToken = parts[0];
        var expiryTicks = long.Parse(parts[1]);
        var expiryDate = new DateTime(expiryTicks, DateTimeKind.Utc);

        if (storedToken != refreshToken)
        {
            return (Result.Failure(["Invalid refresh token"]), Guid.Empty, string.Empty, new List<string>());
        }

        if (expiryDate < DateTime.UtcNow)
        {
            await userManager.RemoveAuthenticationTokenAsync(user, "Default", "RefreshToken");
            return (Result.Failure(["Refresh token expired"]), Guid.Empty, string.Empty, new List<string>());
        }

        var roles = await userManager.GetRolesAsync(user);
        return (Result.Success(), user.Id, user.Email!, roles);
    }

    public async Task ResetPasswordAsync(string email, string code, string newPassword)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null) return;

        var result = await userManager.ResetPasswordAsync(user, code, newPassword);

        if (!result.Succeeded) throw new ValidationException();
    }

    public async Task<string?> GeneratePasswordResetTokenAsync(string email)
    {
        var user = await userManager.FindByEmailAsync(email);

        if (user == null || !await userManager.IsEmailConfirmedAsync(user))
        {
            return null;
        }

        return await userManager.GeneratePasswordResetTokenAsync(user);
    }
}
