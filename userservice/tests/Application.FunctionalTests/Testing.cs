using UserService.Domain.Constants;
using UserService.Infrastructure.Data;
using UserService.Infrastructure.Identity;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace UserService.Application.FunctionalTests;

[SetUpFixture]
public partial class Testing
{
    private static ITestDatabase _database = null!;
    private static CustomWebApplicationFactory _factory = null!;
    private static IServiceScopeFactory _scopeFactory = null!;
    private static Guid? _userId;
    private static List<string>? _roles;

    [OneTimeSetUp]
    public async Task RunBeforeAnyTests()
    {
        _database = await TestDatabaseFactory.CreateAsync();
        _factory = new CustomWebApplicationFactory(_database.GetConnection(), _database.GetConnectionString());
        _scopeFactory = _factory.Services.GetRequiredService<IServiceScopeFactory>();
    }

    public static async Task<TResponse> SendAsync<TResponse>(IRequest<TResponse> request)
    {
        using var scope = _scopeFactory.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
        return await mediator.Send(request);
    }

    public static async Task SendAsync(IBaseRequest request)
    {
        using var scope = _scopeFactory.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
        await mediator.Send(request);
    }

    public static Guid? GetUserId() => _userId;

    public static List<string>? GetRoles() => _roles;

    public static async Task<Guid?> RunAsDefaultUserAsync(string login = "test@local", string password = "Testing1234!")
    {
        return await RunAsUserAsync(login, password, []);
    }

    public static async Task<Guid?> RunAsAdministratorAsync()
    {
        return await RunAsUserAsync("administrator@local", "Administrator1234!", [Roles.Administrator]);
    }

    public static async Task<Guid?> RunAsUserAsync(string userName, string password, string[] roles)
    {
        using var scope = _scopeFactory.CreateScope();

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var user = new ApplicationUser { UserName = userName, Email = userName };
        var result = await userManager.CreateAsync(user, password);

        if (roles.Length != 0)
        {
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            foreach (var role in roles)
            {
                await roleManager.CreateAsync(new IdentityRole<Guid> { Name = role });
            }
            await userManager.AddToRolesAsync(user, roles);
        }

        if (result.Succeeded)
        {
            _userId = user.Id;
            _roles = roles.ToList();
            return _userId;
        }

        var errors = string.Join(Environment.NewLine, result.ToApplicationResult().Errors);
        throw new Exception($"Unable to create {userName}.{Environment.NewLine}{errors}");
    }

    /// <summary>
    /// Creates a user with a confirmed email so they can log in via LoginUserCommand.
    /// Unlike RunAsDefaultUserAsync, does NOT set IUser mock context.
    /// </summary>
    public static async Task<(Guid UserId, string Email, string Password)> CreateConfirmedUserAsync(
        string email = "confirmed@local",
        string password = "Testing1234!")
    {
        using var scope = _scopeFactory.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Set EmailConfirmed = true directly — avoids the data-protection token flow
        // which is not reliable in a non-HTTP test context.
        var user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
        var result = await userManager.CreateAsync(user, password);

        if (!result.Succeeded)
        {
            var errors = string.Join(Environment.NewLine, result.ToApplicationResult().Errors);
            throw new Exception($"Unable to create {email}.{Environment.NewLine}{errors}");
        }

        return (user.Id, email, password);
    }

    public static async Task ResetState()
    {
        try
        {
            await _database.ResetAsync();
        }
        catch (Exception)
        {
            // ignored
        }

        _userId = null;
        _roles = null;
    }

    public static IServiceScope GetScope() => _scopeFactory.CreateScope();

    /// <summary>
    /// Directly sets the user ID returned by the IUser mock.
    /// Use when you need IUser to represent a user created outside of RunAs* helpers.
    /// </summary>
    public static void SetCurrentUser(Guid userId)
    {
        _userId = userId;
        _roles = [];
    }

    public static async Task<TEntity?> FindAsync<TEntity>(params object[] keyValues)
        where TEntity : class
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await context.FindAsync<TEntity>(keyValues);
    }

    public static async Task AddAsync<TEntity>(TEntity entity)
        where TEntity : class
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Add(entity);
        await context.SaveChangesAsync();
    }

    public static async Task<int> CountAsync<TEntity>() where TEntity : class
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await context.Set<TEntity>().CountAsync();
    }

    [OneTimeTearDown]
    public async Task RunAfterAnyTests()
    {
        await _database.DisposeAsync();
        await _factory.DisposeAsync();
    }
}
