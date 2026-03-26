using System.Data.Common;
using UserService.Domain.Enums;
using UserService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Respawn;

namespace UserService.Application.FunctionalTests;

public class PostgreSqlTestDatabase : ITestDatabase
{
    private readonly string _connectionString;
    private NpgsqlConnection _connection = null!;
    private Respawner _respawner = null!;

    public PostgreSqlTestDatabase()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("UserServiceDb");
        Guard.Against.Null(connectionString);
        _connectionString = connectionString;
    }

    public async Task InitialiseAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_connectionString, o => o
                .MapEnum<AssetLifetime>(schemaName: ApplicationDbContext.DefaultSchemaName))
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var context = new ApplicationDbContext(options);
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();

        _connection = new NpgsqlConnection(_connectionString);
        await _connection.OpenAsync();

        _respawner = await Respawner.CreateAsync(_connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = [ApplicationDbContext.DefaultSchemaName]
        });
    }

    public DbConnection GetConnection() => _connection;

    public string GetConnectionString() => _connectionString;

    public async Task ResetAsync()
    {
        await _respawner.ResetAsync(_connection);
    }

    public async Task DisposeAsync()
    {
        await _connection.DisposeAsync();
    }
}
