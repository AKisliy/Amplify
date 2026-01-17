using UserService.Domain.Constants;
using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace UserService.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        if (app.Environment.IsDevelopment())
        {
            await initialiser.InitialiseAsync();
            await initialiser.SeedAsync();
        }
    }
}

public class ApplicationDbContextInitialiser(
    ILogger<ApplicationDbContextInitialiser> logger,
    ApplicationDbContext context,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager)
{
    public async Task InitialiseAsync()
    {
        try
        {
            // See https://jasontaylor.dev/ef-core-database-initialisation-strategies
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // Default roles
        var administratorRole = new IdentityRole<Guid>(Roles.Administrator);

        if (roleManager.Roles.All(r => r.Name != administratorRole.Name))
        {
            await roleManager.CreateAsync(administratorRole);
        }

        // Default users
        var adminId = new Guid("03852b28-2cfb-490a-8ba7-df7b6b888920");
        var administrator = new ApplicationUser { Id = adminId, UserName = "administrator@localhost", Email = "administrator@localhost" };

        if (userManager.Users.All(u => u.UserName != administrator.UserName))
        {
            var creationResult = await userManager.CreateAsync(administrator, "Administrator1!");

            var confirmEmailToken = await userManager.GenerateEmailConfirmationTokenAsync(administrator);
            await userManager.ConfirmEmailAsync(administrator, confirmEmailToken);

            if (!string.IsNullOrWhiteSpace(administratorRole.Name))
            {
                await userManager.AddToRolesAsync(administrator, [administratorRole.Name]);
            }

            logger.LogInformation(
                "Created default administrator user with username '{UserName}' and password 'Administrator1!'.",
                administrator.UserName);
        }

        // Default data
        // Seed, if necessary
        if (!context.Projects.Any())
        {
            context.Projects.Add(new Domain.Entities.Project
            {
                Name = "Default Project",
                Description = "This is your default project.",
                UserId = administrator.Id
            });

            await context.SaveChangesAsync();
        }
    }
}
