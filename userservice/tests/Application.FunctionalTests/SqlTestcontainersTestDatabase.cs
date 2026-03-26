using System.Data.Common;
using UserService.Domain.Enums;
using UserService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

namespace UserService.Application.FunctionalTests;

public class PostgreSqlTestcontainersTestDatabase : ITestDatabase
{
    private readonly PostgreSqlContainer _container;
    private NpgsqlConnection _connection = null!;
    private string _connectionString = null!;
    private Respawner _respawner = null!;

    public PostgreSqlTestcontainersTestDatabase()
    {
        _container = new PostgreSqlBuilder()
            .WithAutoRemove(true)
            .Build();
    }

    public async Task InitialiseAsync()
    {
        await _container.StartAsync();

        _connectionString = _container.GetConnectionString();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_connectionString, o => o
                .MapEnum<AssetLifetime>(schemaName: ApplicationDbContext.DefaultSchemaName))
            .UseSnakeCaseNamingConvention()
            .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))
            .Options;

        await using var context = new ApplicationDbContext(options);
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
        await _container.DisposeAsync();
    }
}
