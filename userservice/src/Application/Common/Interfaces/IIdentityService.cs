using UserService.Application.Common.Models;

namespace UserService.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<string?> GetUserNameAsync(Guid userId);

    Task<bool> IsInRoleAsync(Guid userId, string role);

    Task<bool> AuthorizeAsync(Guid userId, string policyName);

    Task<(Result Result, Guid UserId)> CreateUserAsync(string userName, string password);

    Task<Result> DeleteUserAsync(Guid userId);

    Task<string> GenerateEmailConfirmationTokenAsync(Guid userId);

    Task ConfirmUserEmail(Guid userId, string code);

    Task<(Guid UserId, string Email, IList<string> Roles)> AuthenticateAsync(string email, string password);

    Task<(Result Result, Guid UserId, string Email, IList<string> Roles)> ValidateRefreshTokenAsync(Guid userId, string refreshToken);
}
