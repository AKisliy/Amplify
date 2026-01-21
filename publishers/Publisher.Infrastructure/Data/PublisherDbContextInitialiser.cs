using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Publisher.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this IHost app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<PublisherDbContextInitialiser>();

        var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

        if (env.IsDevelopment())
        {
            await initialiser.InitialiseAsync();
        }
    }
}

public class PublisherDbContextInitialiser(
    ILogger<PublisherDbContextInitialiser> logger,
    PublisherDbContext context)
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
}

