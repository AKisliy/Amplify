using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using WebSocketGateway.Infrastructure.Data;

namespace WebSocketGateway.Application.FunctionalTests;

[SetUpFixture]
public class Testing
{
    private static PostgreSqlTestDatabase _database = null!;

    [OneTimeSetUp]
    public async Task RunBeforeAnyTests()
    {
        _database = new PostgreSqlTestDatabase();
        await _database.InitialiseAsync();
    }

    [OneTimeTearDown]
    public async Task RunAfterAnyTests()
    {
        await _database.DisposeAsync();
    }

    public static async Task ResetState() => await _database.ResetAsync();

    public static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_database.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))
            .Options;

        return new ApplicationDbContext(options);
    }

    public static async Task AddAsync<TEntity>(TEntity entity) where TEntity : class
    {
        await using var ctx = CreateDbContext();
        ctx.Add(entity);
        await ctx.SaveChangesAsync();
    }
}
