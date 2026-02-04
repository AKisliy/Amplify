using System.Globalization;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        await initialiser.InitialiseAsync();
        await initialiser.SeedAsync();
    }
}

public class ApplicationDbContextInitialiser(
    ILogger<ApplicationDbContextInitialiser> logger,
    ApplicationDbContext context)
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
            logger.LogWarning("There was a problem while seeding DB: {ExceptionMessage}", ex.Message);
        }
    }

    public async Task TrySeedAsync()
    {
        // Default data
        // Seed, if necessary
        var projectId = new Guid("7780aa16-edd0-4849-af77-f4280da56d6a");
        var accountId = new Guid("7b577f75-d8a7-40c0-87d4-17bd49bb6842");
        var autoListId = new Guid("8dafea28-5230-445a-84b2-04e98cebce54");
        var autoListEntryId = new Guid("dfc14e82-47ca-4b1e-979b-ba04758fd49b");
        const string defaultJwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6ImY1MTdhNjdjLTAyYjEtNDcxMC05YjM1LTA0OTJiMDI5ZDBjNCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImZyb250ZW5kQGRldi5sb2NhbCIsInJvbGUiOiJBZG1pbiIsImV4cCI6NDkyNTcyNzQ4MSwiaXNzIjoiZGV2LWxvY2FsIiwiYXVkIjoicHVibGlzaGVyLWFwaSJ9.UrSq4n_bP-UYX5bZdR81RvhncRm4uOod4ljEqkjGDW0";

        context.Projects.Add(new Project
        {
            Id = projectId
        });

        logger.LogInformation("Default project was added to DB with ID: {ProjectId}", projectId);

        var account = new SocialAccount
        {
            Id = accountId,
            ProjectId = projectId,
            Username = "AKisliy",
            Provider = SocialProvider.Instagram,
            Credentials = "",
            TokenExpiresAt = DateTime.UtcNow.AddYears(100)
        };

        context.SocialAccounts.Add(account);

        logger.LogInformation("Added default account to DB with ID: {AccountId}", accountId);

        var autoList = new AutoList
        {
            Id = autoListId,
            Name = "Default autolist",
            ProjectId = projectId,
            Accounts = [account]
        };

        logger.LogInformation("Added default autolist with ID: {AutoListId}", autoListId);

        var autoListEntry = new AutoListEntry
        {
            Id = autoListEntryId,
            AutoListId = autoListId,
            DayOfWeeks = 2,
            PublicationTime = TimeOnly.Parse("21:00", CultureInfo.InvariantCulture)
        };

        logger.LogInformation("Added default autolist entry with ID: {AutoListEntryId}", autoListEntryId);

        context.AutoLists.Add(autoList);
        context.AutoListEntries.Add(autoListEntry);

        await context.SaveChangesAsync();

        logger.LogInformation("Your default JWT token (expires in 100 years, for testing ONLY): {JwtToken}", defaultJwtToken);
    }
}
